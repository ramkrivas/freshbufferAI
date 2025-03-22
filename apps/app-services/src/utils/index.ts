import { convertChatHistoryToText, FreshbufferAIMemory, getInputVariables, handleEscapeCharacters, ICommonObject } from 'core-plugins'
import {
    INodeData,
    BuildFlowParams,
    INodeQueue,
    IExploredNode,
    IReactFlowNode,
    IReactFlowEdge,
    INodeDirectedGraph,
    INodeDependencies,
    IMessage,
    IVariable,
    IncomingInput,
    IComponentNodes,
    IDepthQueue,
    IVariableDict
} from '@app-services/core/Interfaces'
import { getFileName } from './FileSytem/getFileName'
import logger from '@app-services/core/Logger'
import { cloneDeep, get, isEqual } from 'lodash'
import { DataSource } from 'typeorm'
import { FreshbufferAiError } from '@app-services/core/Errors'
import { StatusCodes } from 'http-status-codes'
import { IDatabaseEntity } from '@app-services/modules/DocumentStore'
import { DocumentStore, ChatFlow, ChatMessage, DocumentStoreFileChunk, Credential } from '../core/Database/Entities'

export * from './FileSytem/getFileName'
export * from './FileSytem/getNodeModulesPackagePath'
export * from './Security/XSS'
export * from './Credentials/CredentialsUtil'
export * from './Storage/getFileFromStorage'

export const databaseEntities: IDatabaseEntity = {
    ChatFlow: ChatFlow,
    ChatMessage: ChatMessage,
    Credential: Credential,
    DocumentStore: DocumentStore,
    DocumentStoreFileChunk: DocumentStoreFileChunk
}

const QUESTION_VAR_PREFIX = 'question'
const FILE_ATTACHMENT_PREFIX = 'file_attachment'
const CHAT_HISTORY_VAR_PREFIX = 'chat_history'
/**
 * Save upsert flowData
 * @param {INodeData} nodeData
 * @param {Record<string, any>} upsertHistory
 */
export const saveUpsertFlowData = (nodeData: INodeData, upsertHistory: Record<string, any>): ICommonObject[] => {
    const existingUpsertFlowData = upsertHistory['flowData'] ?? []
    const paramValues: ICommonObject[] = []

    for (const input in nodeData.inputs) {
        const inputParam = nodeData.inputParams.find((inp) => inp.name === input)
        if (!inputParam) continue

        let paramValue: ICommonObject = {}

        if (!nodeData.inputs[input]) {
            continue
        }
        if (
            typeof nodeData.inputs[input] === 'string' &&
            nodeData.inputs[input].startsWith('{{') &&
            nodeData.inputs[input].endsWith('}}')
        ) {
            continue
        }
        // Get file name instead of the base64 string
        if (nodeData.category === 'Document Loaders' && nodeData.inputParams.find((inp) => inp.name === input)?.type === 'file') {
            paramValue = {
                label: inputParam?.label,
                name: inputParam?.name,
                type: inputParam?.type,
                value: getFileName(nodeData.inputs[input])
            }
            paramValues.push(paramValue)
            continue
        }

        paramValue = {
            label: inputParam?.label,
            name: inputParam?.name,
            type: inputParam?.type,
            value: nodeData.inputs[input]
        }
        paramValues.push(paramValue)
    }

    const newFlowData = {
        label: nodeData.label,
        name: nodeData.name,
        category: nodeData.category,
        id: nodeData.id,
        paramValues
    }
    existingUpsertFlowData.push(newFlowData)
    return existingUpsertFlowData
}

/**
 * Build flow from start to end
 * @param {BuildFlowParams} params
 */
export const buildFlow = async ({
    startingNodeIds,
    reactFlowNodes,
    reactFlowEdges,
    graph,
    depthQueue,
    componentNodes,
    question,
    uploadedFilesContent,
    chatHistory,
    apiMessageId,
    chatId,
    sessionId,
    chatflowid,
    appDataSource,
    overrideConfig,
    availableVariables = [],
    variableOverrides = [],
    cachePool,
    isUpsert,
    stopNodeId,
    uploads,
    baseURL
}: BuildFlowParams) => {
    const flowNodes = cloneDeep(reactFlowNodes)
    let upsertHistory: Record<string, any> = {}

    // Create a Queue and add our initial node in it
    const nodeQueue = [] as INodeQueue[]
    const exploredNode = {} as IExploredNode
    const dynamicVariables = {} as Record<string, unknown>
    let ignoreNodeIds: string[] = []

    // In the case of infinite loop, only max 3 loops will be executed
    const maxLoop = 3

    for (let i = 0; i < startingNodeIds.length; i += 1) {
        nodeQueue.push({ nodeId: startingNodeIds[i], depth: 0 })
        exploredNode[startingNodeIds[i]] = { remainingLoop: maxLoop, lastSeenDepth: 0 }
    }

    const initializedNodes: Set<string> = new Set()
    const reversedGraph = constructGraphs(reactFlowNodes, reactFlowEdges, { isReversed: true }).graph

    const flowData: ICommonObject = {
        chatflowid,
        chatId,
        sessionId,
        chatHistory,
        ...overrideConfig
    }
    while (nodeQueue.length) {
        const { nodeId, depth } = nodeQueue.shift() as INodeQueue

        const reactFlowNode = flowNodes.find((nd) => nd.id === nodeId)
        const nodeIndex = flowNodes.findIndex((nd) => nd.id === nodeId)
        if (!reactFlowNode || reactFlowNode === undefined || nodeIndex < 0) continue

        try {
            const nodeInstanceFilePath = componentNodes[reactFlowNode.data.name].filePath as string
            const nodeModule = await import(nodeInstanceFilePath)
            const newNodeInstance = new nodeModule.nodeClass()

            let flowNodeData = cloneDeep(reactFlowNode.data)

            if (isUpsert) upsertHistory['flowData'] = saveUpsertFlowData(flowNodeData, upsertHistory)

            const reactFlowNodeData: INodeData = await resolveVariables(
                appDataSource,
                flowNodeData,
                flowNodes,
                question,
                chatHistory,
                flowData,
                uploadedFilesContent
            )

            if (isUpsert && stopNodeId && nodeId === stopNodeId) {
                logger.debug(`[server]: Upserting ${reactFlowNode.data.label} (${reactFlowNode.data.id})`)
                const indexResult = await newNodeInstance.vectorStoreMethods!['upsert']!.call(newNodeInstance, reactFlowNodeData, {
                    chatId,
                    sessionId,
                    chatflowid,
                    chatHistory,
                    apiMessageId,
                    logger,
                    appDataSource,
                    databaseEntities,
                    cachePool,
                    dynamicVariables,
                    uploads,
                    baseURL
                })
                if (indexResult) upsertHistory['result'] = indexResult
                logger.debug(`[server]: Finished upserting ${reactFlowNode.data.label} (${reactFlowNode.data.id})`)
                break
            } else if (
                !isUpsert &&
                reactFlowNode.data.category === 'Document Loaders' &&
                checkIfDocLoaderShouldBeIgnored(reactFlowNode, reactFlowNodes, reactFlowEdges)
            ) {
                initializedNodes.add(nodeId)
            } else {
                logger.debug(`[server]: Initializing ${reactFlowNode.data.label} (${reactFlowNode.data.id})`)
                const finalQuestion = uploadedFilesContent ? `${uploadedFilesContent}\n\n${question}` : question

                let outputResult = await newNodeInstance.init(reactFlowNodeData, finalQuestion, {
                    chatId,
                    sessionId,
                    chatflowid,
                    chatHistory,
                    logger,
                    appDataSource,
                    databaseEntities,
                    cachePool,
                    isUpsert,
                    dynamicVariables,
                    uploads,
                    baseURL,
                    componentNodes: componentNodes as ICommonObject
                })

                // Save dynamic variables
                if (reactFlowNode.data.name === 'setVariable') {
                    const dynamicVars = outputResult?.dynamicVariables ?? {}

                    for (const variableKey in dynamicVars) {
                        dynamicVariables[variableKey] = dynamicVars[variableKey]
                    }

                    outputResult = outputResult?.output
                }

                // Determine which nodes to route next when it comes to ifElse
                if (reactFlowNode.data.name === 'ifElseFunction' && typeof outputResult === 'object') {
                    let sourceHandle = ''
                    if (outputResult.type === true) {
                        // sourceHandle = `${nodeId}-output-returnFalse-string|number|boolean|json|array`
                        sourceHandle = (
                            reactFlowNode.data.outputAnchors.flatMap((n) => n.options).find((n) => n?.name === 'returnFalse') as any
                        )?.id
                    } else if (outputResult.type === false) {
                        // sourceHandle = `${nodeId}-output-returnTrue-string|number|boolean|json|array`
                        sourceHandle = (
                            reactFlowNode.data.outputAnchors.flatMap((n) => n.options).find((n) => n?.name === 'returnTrue') as any
                        )?.id
                    }

                    const ifElseEdge = reactFlowEdges.find((edg) => edg.source === nodeId && edg.sourceHandle === sourceHandle)
                    if (ifElseEdge) {
                        const { graph } = constructGraphs(
                            reactFlowNodes,
                            reactFlowEdges.filter((edg) => !(edg.source === nodeId && edg.sourceHandle === sourceHandle)),
                            { isNonDirected: true }
                        )
                        ignoreNodeIds.push(ifElseEdge.target, ...getAllConnectedNodes(graph, ifElseEdge.target))
                        ignoreNodeIds = [...new Set(ignoreNodeIds)]
                    }

                    outputResult = outputResult?.output
                }

                flowNodes[nodeIndex].data.instance = outputResult

                logger.debug(`[server]: Finished initializing ${reactFlowNode.data.label} (${reactFlowNode.data.id})`)
                initializedNodes.add(reactFlowNode.data.id)
            }
        } catch (e: any) {
            logger.error(e)
            throw new Error(e)
        }

        let neighbourNodeIds = graph[nodeId]
        const nextDepth = depth + 1

        // Find other nodes that are on the same depth level
        const sameDepthNodeIds = Object.keys(depthQueue).filter((key) => depthQueue[key] === nextDepth)

        for (const id of sameDepthNodeIds) {
            if (neighbourNodeIds.includes(id)) continue
            neighbourNodeIds.push(id)
        }

        neighbourNodeIds = neighbourNodeIds.filter((neigh) => !ignoreNodeIds.includes(neigh))

        for (let i = 0; i < neighbourNodeIds.length; i += 1) {
            const neighNodeId = neighbourNodeIds[i]
            if (ignoreNodeIds.includes(neighNodeId)) continue
            if (initializedNodes.has(neighNodeId)) continue
            if (reversedGraph[neighNodeId].some((dependId) => !initializedNodes.has(dependId))) continue
            // If nodeId has been seen, cycle detected
            if (Object.prototype.hasOwnProperty.call(exploredNode, neighNodeId)) {
                const { remainingLoop, lastSeenDepth } = exploredNode[neighNodeId]

                if (lastSeenDepth === nextDepth) continue

                if (remainingLoop === 0) {
                    break
                }
                const remainingLoopMinusOne = remainingLoop - 1
                exploredNode[neighNodeId] = { remainingLoop: remainingLoopMinusOne, lastSeenDepth: nextDepth }
                nodeQueue.push({ nodeId: neighNodeId, depth: nextDepth })
            } else {
                exploredNode[neighNodeId] = { remainingLoop: maxLoop, lastSeenDepth: nextDepth }
                nodeQueue.push({ nodeId: neighNodeId, depth: nextDepth })
            }
        }

        // Move end node to last
        if (!neighbourNodeIds.length) {
            const index = flowNodes.findIndex((nd) => nd.data.id === nodeId)
            flowNodes.push(flowNodes.splice(index, 1)[0])
        }
    }
    return isUpsert ? (upsertHistory as any) : flowNodes
}

/**
 * Construct graph and node dependencies score
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {IReactFlowEdge[]} reactFlowEdges
 * @param {{ isNonDirected?: boolean, isReversed?: boolean }} options
 */
export const constructGraphs = (
    reactFlowNodes: IReactFlowNode[],
    reactFlowEdges: IReactFlowEdge[],
    options?: { isNonDirected?: boolean; isReversed?: boolean }
) => {
    const nodeDependencies = {} as INodeDependencies
    const graph = {} as INodeDirectedGraph

    for (let i = 0; i < reactFlowNodes.length; i += 1) {
        const nodeId = reactFlowNodes[i].id
        nodeDependencies[nodeId] = 0
        graph[nodeId] = []
    }

    if (options && options.isReversed) {
        for (let i = 0; i < reactFlowEdges.length; i += 1) {
            const source = reactFlowEdges[i].source
            const target = reactFlowEdges[i].target

            if (Object.prototype.hasOwnProperty.call(graph, target)) {
                graph[target].push(source)
            } else {
                graph[target] = [source]
            }

            nodeDependencies[target] += 1
        }

        return { graph, nodeDependencies }
    }

    for (let i = 0; i < reactFlowEdges.length; i += 1) {
        const source = reactFlowEdges[i].source
        const target = reactFlowEdges[i].target

        if (Object.prototype.hasOwnProperty.call(graph, source)) {
            graph[source].push(target)
        } else {
            graph[source] = [target]
        }

        if (options && options.isNonDirected) {
            if (Object.prototype.hasOwnProperty.call(graph, target)) {
                graph[target].push(source)
            } else {
                graph[target] = [source]
            }
        }
        nodeDependencies[target] += 1
    }

    return { graph, nodeDependencies }
}

/**
 * Loop through each inputs and resolve variable if neccessary
 * @param {INodeData} reactFlowNodeData
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {string} question
 * @returns {INodeData}
 */
export const resolveVariables = async (
    appDataSource: DataSource,
    reactFlowNodeData: INodeData,
    reactFlowNodes: IReactFlowNode[],
    question: string,
    chatHistory: IMessage[],
    flowData?: ICommonObject,
    uploadedFilesContent?: string
): Promise<INodeData> => {
    let flowNodeData = cloneDeep(reactFlowNodeData)
    const types = 'inputs'

    const getParamValues = async (paramsObj: ICommonObject) => {
        for (const key in paramsObj) {
            const paramValue: string = paramsObj[key]
            if (Array.isArray(paramValue)) {
                const resolvedInstances = []
                for (const param of paramValue) {
                    const resolvedInstance = await getVariableValue(
                        appDataSource,
                        param,
                        reactFlowNodes,
                        question,
                        chatHistory,
                        undefined,
                        flowData,
                        uploadedFilesContent,
                        [],
                        []
                    )
                    resolvedInstances.push(resolvedInstance)
                }
                paramsObj[key] = resolvedInstances
            } else {
                const isAcceptVariable = reactFlowNodeData.inputParams.find((param) => param.name === key)?.acceptVariable ?? false
                const resolvedInstance = await getVariableValue(
                    appDataSource,
                    paramValue,
                    reactFlowNodes,
                    question,
                    chatHistory,
                    isAcceptVariable,
                    flowData,
                    uploadedFilesContent,
                    [],
                    []
                )
                paramsObj[key] = resolvedInstance
            }
        }
    }

    const paramsObj = flowNodeData[types] ?? {}
    await getParamValues(paramsObj)

    return flowNodeData
}
/**
 * Method that find memory that is connected within chatflow
 * In a chatflow, there should only be 1 memory node
 * @param {IReactFlowNode[]} nodes
 * @param {IReactFlowEdge[]} edges
 * @returns {IReactFlowNode | undefined}
 */
export const findMemoryNode = (nodes: IReactFlowNode[], edges: IReactFlowEdge[]): IReactFlowNode | undefined => {
    const memoryNodes = nodes.filter((node) => node.data.category === 'Memory')
    const memoryNodeIds = memoryNodes.map((mem) => mem.data.id)

    for (const edge of edges) {
        if (memoryNodeIds.includes(edge.source)) {
            const memoryNode = nodes.find((node) => node.data.id === edge.source)
            return memoryNode
        }
    }

    return undefined
}

/**
 * Get ending node and check if flow is valid
 * @param {INodeDependencies} nodeDependencies
 * @param {INodeDirectedGraph} graph
 * @param {IReactFlowNode[]} allNodes
 */
export const getEndingNodes = (
    nodeDependencies: INodeDependencies,
    graph: INodeDirectedGraph,
    allNodes: IReactFlowNode[]
): IReactFlowNode[] => {
    const endingNodeIds: string[] = []
    Object.keys(graph).forEach((nodeId) => {
        if (Object.keys(nodeDependencies).length === 1) {
            endingNodeIds.push(nodeId)
        } else if (!graph[nodeId].length && nodeDependencies[nodeId] > 0) {
            endingNodeIds.push(nodeId)
        }
    })

    let endingNodes = allNodes.filter((nd) => endingNodeIds.includes(nd.id))

    // If there are multiple endingnodes, the failed ones will be automatically ignored.
    // And only ensure that at least one can pass the verification.
    const verifiedEndingNodes: typeof endingNodes = []
    let error: FreshbufferAiError | null = null
    for (const endingNode of endingNodes) {
        const endingNodeData = endingNode.data
        if (!endingNodeData) {
            error = new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending node ${endingNode.id} data not found`)

            continue
        }

        const isEndingNode = endingNodeData?.outputs?.output === 'EndingNode'

        if (!isEndingNode) {
            if (
                endingNodeData &&
                endingNodeData.category !== 'Chains' &&
                endingNodeData.category !== 'Agents' &&
                endingNodeData.category !== 'Engine' &&
                endingNodeData.category !== 'Multi Agents' &&
                endingNodeData.category !== 'Sequential Agents'
            ) {
                error = new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending node must be either a Chain or Agent or Engine`)
                continue
            }
        }
        verifiedEndingNodes.push(endingNode)
    }

    if (verifiedEndingNodes.length > 0) {
        return verifiedEndingNodes
    }

    if (endingNodes.length === 0 || error === null) {
        error = new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Ending nodes not found`)
    }

    throw error
}

/**
 * Get sessionId
 * Hierarchy of sessionId (top down)
 * API/Embed:
 * (1) Provided in API body - incomingInput.overrideConfig: { sessionId: 'abc' }
 * (2) Provided in API body - incomingInput.chatId
 *
 * API/Embed + UI:
 * (3) Hard-coded sessionId in UI
 * (4) Not specified on UI nor API, default to chatId
 * @param {IReactFlowNode | undefined} memoryNode
 * @param {IncomingInput} incomingInput
 * @param {string} chatId
 * @param {boolean} isInternal
 * @returns {string}
 */
export const getMemorySessionId = (
    memoryNode: IReactFlowNode | undefined,
    incomingInput: IncomingInput,
    chatId: string,
    isInternal: boolean
): string => {
    if (!isInternal) {
        // Provided in API body - incomingInput.overrideConfig: { sessionId: 'abc' }
        if (incomingInput.overrideConfig?.sessionId) {
            return incomingInput.overrideConfig?.sessionId
        }
        // Provided in API body - incomingInput.chatId
        if (incomingInput.chatId) {
            return incomingInput.chatId
        }
    }

    // Hard-coded sessionId in UI
    if (memoryNode && memoryNode.data.inputs?.sessionId) {
        return memoryNode.data.inputs.sessionId
    }

    // Default chatId
    return chatId
}

/**
 * Get chat messages from sessionId
 * @param {IReactFlowNode} memoryNode
 * @param {string} sessionId
 * @param {IReactFlowNode} memoryNode
 * @param {IComponentNodes} componentNodes
 * @param {DataSource} appDataSource
 * @param {IDatabaseEntity} databaseEntities
 * @param {any} logger
 * @returns {IMessage[]}
 */
export const getSessionChatHistory = async (
    chatflowid: string,
    sessionId: string,
    memoryNode: IReactFlowNode,
    componentNodes: IComponentNodes,
    appDataSource: DataSource,
    databaseEntities: IDatabaseEntity,
    logger: any,
    prependMessages?: IMessage[]
): Promise<IMessage[]> => {
    const nodeInstanceFilePath = componentNodes[memoryNode.data.name].filePath as string
    const nodeModule = await import(nodeInstanceFilePath)
    const newNodeInstance = new nodeModule.nodeClass()

    // Replace memory's sessionId/chatId
    if (memoryNode.data.inputs) {
        memoryNode.data.inputs.sessionId = sessionId
    }

    const initializedInstance: FreshbufferAIMemory = await newNodeInstance.init(memoryNode.data, '', {
        chatflowid,
        appDataSource,
        databaseEntities,
        logger
    })

    return (await initializedInstance.getChatMessages(sessionId, undefined, prependMessages)) as IMessage[]
}

/**
 * Get starting nodes and check if flow is valid
 * @param {INodeDependencies} graph
 * @param {string} endNodeId
 */
export const getStartingNodes = (graph: INodeDirectedGraph, endNodeId: string) => {
    const depthQueue: IDepthQueue = {
        [endNodeId]: 0
    }

    // Assuming that this is a directed acyclic graph, there will be no infinite loop problem.
    const walkGraph = (nodeId: string) => {
        const depth = depthQueue[nodeId]
        graph[nodeId].flatMap((id) => {
            depthQueue[id] = Math.max(depthQueue[id] ?? 0, depth + 1)
            walkGraph(id)
        })
    }

    walkGraph(endNodeId)

    const maxDepth = Math.max(...Object.values(depthQueue))
    const depthQueueReversed: IDepthQueue = {}
    for (const nodeId in depthQueue) {
        if (Object.prototype.hasOwnProperty.call(depthQueue, nodeId)) {
            depthQueueReversed[nodeId] = Math.abs(depthQueue[nodeId] - maxDepth)
        }
    }

    const startingNodeIds = Object.entries(depthQueueReversed)
        .filter(([_, depth]) => depth === 0)
        .map(([id, _]) => id)

    return { startingNodeIds, depthQueue: depthQueueReversed }
}

/**
 * Check to see if flow valid for stream
 * TODO: perform check from component level. i.e: set streaming on component, and check here
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {INodeData} endingNodeData
 * @returns {boolean}
 */
export const isFlowValidForStream = (reactFlowNodes: IReactFlowNode[], endingNodeData: INodeData) => {
    /** Deprecated, add streaming input param to the component instead **/
    const streamAvailableLLMs = {
        'Chat Models': [
            'azureChatOpenAI',
            'chatOpenAI',
            'chatOpenAI_LlamaIndex',
            'chatOpenAICustom',
            'chatAnthropic',
            'chatAnthropic_LlamaIndex',
            'chatOllama',
            'chatOllama_LlamaIndex',
            'awsChatBedrock',
            'chatMistralAI',
            'chatMistral_LlamaIndex',
            'chatAlibabaTongyi',
            'groqChat',
            'chatGroq_LlamaIndex',
            'chatCohere',
            'chatGoogleGenerativeAI',
            'chatTogetherAI',
            'chatTogetherAI_LlamaIndex',
            'chatFireworks',
            'chatBaiduWenxin'
        ],
        LLMs: ['azureOpenAI', 'openAI', 'ollama']
    }

    let isChatOrLLMsExist = false
    for (const flowNode of reactFlowNodes) {
        const data = flowNode.data
        if (data.category === 'Chat Models' || data.category === 'LLMs') {
            if (data.inputs?.streaming === false || data.inputs?.streaming === 'false') {
                return false
            }
            if (data.inputs?.streaming === true || data.inputs?.streaming === 'true') {
                isChatOrLLMsExist = true // passed, proceed to next check
            }
            /** Deprecated, add streaming input param to the component instead **/
            if (!Object.prototype.hasOwnProperty.call(data.inputs, 'streaming') && !data.inputs?.streaming) {
                isChatOrLLMsExist = true
                const validLLMs = streamAvailableLLMs[data.category]
                if (!validLLMs.includes(data.name)) return false
            }
        }
    }

    let isValidChainOrAgent = false
    if (endingNodeData.category === 'Chains') {
        // Chains that are not available to stream
        const blacklistChains = ['openApiChain', 'vectaraQAChain']
        isValidChainOrAgent = !blacklistChains.includes(endingNodeData.name)
    } else if (endingNodeData.category === 'Agents') {
        // Agent that are available to stream
        const whitelistAgents = ['csvAgent', 'airtableAgent', 'toolAgent', 'conversationalRetrievalToolAgent', 'openAIToolAgentLlamaIndex']
        isValidChainOrAgent = whitelistAgents.includes(endingNodeData.name)

        // If agent is openAIAssistant, streaming is enabled
        if (endingNodeData.name === 'openAIAssistant') return true
    } else if (endingNodeData.category === 'Engine') {
        // Engines that are available to stream
        const whitelistEngine = ['contextChatEngine', 'simpleChatEngine', 'queryEngine', 'subQuestionQueryEngine']
        isValidChainOrAgent = whitelistEngine.includes(endingNodeData.name)
    }

    // If no output parser, flow is available to stream
    let isOutputParserExist = false
    for (const flowNode of reactFlowNodes) {
        const data = flowNode.data
        if (data.category.includes('Output Parser')) {
            isOutputParserExist = true
        }
    }

    return isChatOrLLMsExist && isValidChainOrAgent && !isOutputParserExist
}

/**
 * @param {string} existingChatId
 * @param {string} newChatId
 * @returns {boolean}
 */
export const isSameChatId = (existingChatId?: string, newChatId?: string): boolean => {
    if (isEqual(existingChatId, newChatId)) {
        return true
    }
    if (!existingChatId && !newChatId) return true
    return false
}

/**
 * Rebuild flow if new override config is provided
 * @param {boolean} isInternal
 * @param {ICommonObject} existingOverrideConfig
 * @param {ICommonObject} newOverrideConfig
 * @returns {boolean}
 */
export const isSameOverrideConfig = (
    isInternal: boolean,
    existingOverrideConfig?: ICommonObject,
    newOverrideConfig?: ICommonObject
): boolean => {
    if (isInternal) {
        if (existingOverrideConfig && Object.keys(existingOverrideConfig).length) return false
        return true
    }
    // If existing and new overrideconfig are the same
    if (
        existingOverrideConfig &&
        Object.keys(existingOverrideConfig).length &&
        newOverrideConfig &&
        Object.keys(newOverrideConfig).length &&
        isEqual(existingOverrideConfig, newOverrideConfig)
    ) {
        return true
    }
    // If there is no existing and new overrideconfig
    if (!existingOverrideConfig && !newOverrideConfig) return true
    return false
}

/**
 * Rebuild flow if LLMChain has dependency on other chains
 * User Question => Prompt_0 => LLMChain_0 => Prompt-1 => LLMChain_1
 * @param {IReactFlowNode[]} startingNodes
 * @returns {boolean}
 */
export const isStartNodeDependOnInput = (startingNodes: IReactFlowNode[], nodes: IReactFlowNode[]): boolean => {
    for (const node of startingNodes) {
        if (node.data.category === 'Cache') return true
        for (const inputName in node.data.inputs) {
            const inputVariables = getInputVariables(node.data.inputs[inputName])
            if (inputVariables.length > 0) return true
        }
    }
    const whitelistNodeNames = ['vectorStoreToDocument', 'autoGPT', 'chatPromptTemplate', 'promptTemplate'] //If these nodes are found, chatflow cannot be reused
    for (const node of nodes) {
        if (node.data.name === 'chatPromptTemplate' || node.data.name === 'promptTemplate') {
            let promptValues: ICommonObject = {}
            const promptValuesRaw = node.data.inputs?.promptValues
            if (promptValuesRaw) {
                try {
                    promptValues = typeof promptValuesRaw === 'object' ? promptValuesRaw : JSON.parse(promptValuesRaw)
                } catch (exception) {
                    console.error(exception)
                }
            }
            if (getAllValuesFromJson(promptValues).includes(`{{${QUESTION_VAR_PREFIX}}}`)) return true
        } else if (whitelistNodeNames.includes(node.data.name)) return true
    }
    return false
}
/**
 * Get all values from a JSON object
 * @param {any} obj
 * @returns {any[]}
 */
export const getAllValuesFromJson = (obj: any): any[] => {
    const values: any[] = []

    function extractValues(data: any) {
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                for (const item of data) {
                    extractValues(item)
                }
            } else {
                for (const key in data) {
                    extractValues(data[key])
                }
            }
        } else {
            values.push(data)
        }
    }

    extractValues(obj)
    return values
}

/**
 * Clear session memories
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {IComponentNodes} componentNodes
 * @param {string} chatId
 * @param {DataSource} appDataSource
 * @param {string} sessionId
 * @param {string} memoryType
 * @param {string} isClearFromViewMessageDialog
 */
export const clearSessionMemory = async (
    reactFlowNodes: IReactFlowNode[],
    componentNodes: IComponentNodes,
    chatId: string,
    appDataSource: DataSource,
    sessionId?: string,
    memoryType?: string,
    isClearFromViewMessageDialog?: string
) => {
    for (const node of reactFlowNodes) {
        if (node.data.category !== 'Memory' && node.data.type !== 'OpenAIAssistant') continue

        // Only clear specific session memory from View Message Dialog UI
        if (isClearFromViewMessageDialog && memoryType && node.data.label !== memoryType) continue

        const nodeInstanceFilePath = componentNodes[node.data.name].filePath as string
        const nodeModule = await import(nodeInstanceFilePath)
        const newNodeInstance = new nodeModule.nodeClass()
        const options: ICommonObject = { chatId, appDataSource, databaseEntities, logger }

        // SessionId always take priority first because it is the sessionId used for 3rd party memory node
        if (sessionId && node.data.inputs) {
            if (node.data.type === 'OpenAIAssistant') {
                await newNodeInstance.clearChatMessages(node.data, options, { type: 'threadId', id: sessionId })
            } else {
                node.data.inputs.sessionId = sessionId
                const initializedInstance: FreshbufferAIMemory = await newNodeInstance.init(node.data, '', options)
                await initializedInstance.clearChatMessages(sessionId)
            }
        } else if (chatId && node.data.inputs) {
            if (node.data.type === 'OpenAIAssistant') {
                await newNodeInstance.clearChatMessages(node.data, options, { type: 'chatId', id: chatId })
            } else {
                node.data.inputs.sessionId = chatId
                const initializedInstance: FreshbufferAIMemory = await newNodeInstance.init(node.data, '', options)
                await initializedInstance.clearChatMessages(chatId)
            }
        }
    }
}

/**
 * Check if doc loader should be bypassed, ONLY if doc loader is connected to a vector store
 * Reason being we dont want to load the doc loader again whenever we are building the flow, because it was already done during upserting
 * EXCEPT if the vector store is a memory vector store
 * TODO: Remove this logic when we remove doc loader nodes from the canvas
 * @param {IReactFlowNode} reactFlowNode
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {IReactFlowEdge[]} reactFlowEdges
 * @returns {boolean}
 */
const checkIfDocLoaderShouldBeIgnored = (
    reactFlowNode: IReactFlowNode,
    reactFlowNodes: IReactFlowNode[],
    reactFlowEdges: IReactFlowEdge[]
): boolean => {
    let outputId = ''

    if (reactFlowNode.data.outputAnchors.length) {
        if (Object.keys(reactFlowNode.data.outputs || {}).length) {
            const output = reactFlowNode.data.outputs?.output
            const node = reactFlowNode.data.outputAnchors[0].options?.find((anchor) => anchor.name === output)
            if (node) outputId = (node as ICommonObject).id
        } else {
            outputId = (reactFlowNode.data.outputAnchors[0] as ICommonObject).id
        }
    }

    const targetNodeId = reactFlowEdges.find((edge) => edge.sourceHandle === outputId)?.target

    if (targetNodeId) {
        const targetNodeCategory = reactFlowNodes.find((nd) => nd.id === targetNodeId)?.data.category || ''
        const targetNodeName = reactFlowNodes.find((nd) => nd.id === targetNodeId)?.data.name || ''
        if (targetNodeCategory === 'Vector Stores' && targetNodeName !== 'memoryVectorStore') {
            return true
        }
    }

    return false
}

/**
 * Get all connected nodes from startnode
 * @param {INodeDependencies} graph
 * @param {string} startNodeId
 */
export const getAllConnectedNodes = (graph: INodeDirectedGraph, startNodeId: string) => {
    const visited = new Set<string>()
    const queue: Array<[string]> = [[startNodeId]]

    while (queue.length > 0) {
        const [currentNode] = queue.shift()!

        if (visited.has(currentNode)) {
            continue
        }

        visited.add(currentNode)

        for (const neighbor of graph[currentNode]) {
            if (!visited.has(neighbor)) {
                queue.push([neighbor])
            }
        }
    }

    return [...visited]
}

/**
 * Get variable value from outputResponses.output
 * @param {string} paramValue
 * @param {IReactFlowNode[]} reactFlowNodes
 * @param {string} question
 * @param {boolean} isAcceptVariable
 * @returns {string}
 */
export const getVariableValue = async (
    appDataSource: DataSource,
    paramValue: string | object,
    reactFlowNodes: IReactFlowNode[],
    question: string,
    chatHistory: IMessage[],
    isAcceptVariable = false,
    flowData?: ICommonObject,
    uploadedFilesContent?: string,
    availableVariables: IVariable[] = [],
    variableOverrides: ICommonObject[] = []
) => {
    const isObject = typeof paramValue === 'object'
    const initialValue = (isObject ? JSON.stringify(paramValue) : paramValue) ?? ''
    let returnVal = initialValue
    const variableStack = []
    const variableDict = {} as IVariableDict
    let startIdx = 0
    const endIdx = initialValue.length - 1

    while (startIdx < endIdx) {
        const substr = initialValue.substring(startIdx, startIdx + 2)

        // Store the opening double curly bracket
        if (substr === '{{') {
            variableStack.push({ substr, startIdx: startIdx + 2 })
        }

        // Found the complete variable
        if (substr === '}}' && variableStack.length > 0 && variableStack[variableStack.length - 1].substr === '{{') {
            const variableStartIdx = variableStack[variableStack.length - 1].startIdx
            const variableEndIdx = startIdx
            const variableFullPath = initialValue.substring(variableStartIdx, variableEndIdx)

            /**
             * Apply string transformation to convert special chars:
             * FROM: hello i am ben\n\n\thow are you?
             * TO: hello i am benFLOWISE_NEWLINEFLOWISE_NEWLINEFLOWISE_TABhow are you?
             */
            if (isAcceptVariable && variableFullPath === QUESTION_VAR_PREFIX) {
                variableDict[`{{${variableFullPath}}}`] = handleEscapeCharacters(question, false)
            }

            if (isAcceptVariable && variableFullPath === FILE_ATTACHMENT_PREFIX) {
                variableDict[`{{${variableFullPath}}}`] = handleEscapeCharacters(uploadedFilesContent, false)
            }

            if (isAcceptVariable && variableFullPath === CHAT_HISTORY_VAR_PREFIX) {
                variableDict[`{{${variableFullPath}}}`] = handleEscapeCharacters(convertChatHistoryToText(chatHistory), false)
            }

            if (variableFullPath.startsWith('$vars.')) {
                const vars = await getGlobalVariable(appDataSource, flowData, availableVariables, variableOverrides)
                const variableValue = get(vars, variableFullPath.replace('$vars.', ''))
                if (variableValue != null) {
                    variableDict[`{{${variableFullPath}}}`] = variableValue
                    returnVal = returnVal.split(`{{${variableFullPath}}}`).join(variableValue)
                }
            }

            if (variableFullPath.startsWith('$flow.') && flowData) {
                const variableValue = get(flowData, variableFullPath.replace('$flow.', ''))
                if (variableValue != null) {
                    variableDict[`{{${variableFullPath}}}`] = variableValue
                    returnVal = returnVal.split(`{{${variableFullPath}}}`).join(variableValue)
                }
            }

            // Resolve values with following case.
            // 1: <variableNodeId>.data.instance
            // 2: <variableNodeId>.data.instance.pathtokey
            const variableFullPathParts = variableFullPath.split('.')
            const variableNodeId = variableFullPathParts[0]
            const executedNode = reactFlowNodes.find((nd) => nd.id === variableNodeId)
            if (executedNode) {
                let variableValue = get(executedNode.data, 'instance')

                // Handle path such as `<variableNodeId>.data.instance.key`
                if (variableFullPathParts.length > 3) {
                    let variableObj = null
                    switch (typeof variableValue) {
                        case 'string': {
                            const unEscapedVariableValue = handleEscapeCharacters(variableValue, true)
                            if (unEscapedVariableValue.startsWith('{') && unEscapedVariableValue.endsWith('}')) {
                                try {
                                    variableObj = JSON.parse(unEscapedVariableValue)
                                } catch (e) {
                                    // ignore
                                }
                            }
                            break
                        }
                        case 'object': {
                            variableObj = variableValue
                            break
                        }
                        default:
                            break
                    }
                    if (variableObj) {
                        variableObj = get(variableObj, variableFullPathParts.slice(3))
                        variableValue = handleEscapeCharacters(
                            typeof variableObj === 'object' ? JSON.stringify(variableObj) : variableObj,
                            false
                        )
                    }
                }
                if (isAcceptVariable) {
                    variableDict[`{{${variableFullPath}}}`] = variableValue
                } else {
                    returnVal = variableValue
                }
            }
            variableStack.pop()
        }
        startIdx += 1
    }

    if (isAcceptVariable) {
        const variablePaths = Object.keys(variableDict)
        variablePaths.sort() // Sort by length of variable path because longer path could possibly contains nested variable
        variablePaths.forEach((path) => {
            let variableValue: object | string = variableDict[path]
            // Replace all occurrence
            if (typeof variableValue === 'object') {
                // Just get the id of variableValue object if it is agentflow node, to avoid circular JSON error
                if (Object.prototype.hasOwnProperty.call(variableValue, 'predecessorAgents')) {
                    const nodeId = variableValue['id']
                    variableValue = { id: nodeId }
                }

                const stringifiedValue = JSON.stringify(JSON.stringify(variableValue))
                if (stringifiedValue.startsWith('"') && stringifiedValue.endsWith('"')) {
                    // get rid of the double quotes
                    returnVal = returnVal.split(path).join(stringifiedValue.substring(1, stringifiedValue.length - 1))
                } else {
                    returnVal = returnVal.split(path).join(JSON.stringify(variableValue).replace(/"/g, '\\"'))
                }
            } else {
                returnVal = returnVal.split(path).join(variableValue)
            }
        })
        return returnVal
    }
    return isObject ? JSON.parse(returnVal) : returnVal
}

const getGlobalVariable = async (
    appDataSource: DataSource,
    overrideConfig?: ICommonObject,
    availableVariables: IVariable[] = [],
    variableOverrides?: ICommonObject[]
) => {
    // override variables defined in overrideConfig
    // nodeData.inputs.vars is an Object, check each property and override the variable
    if (overrideConfig?.vars && variableOverrides) {
        for (const propertyName of Object.getOwnPropertyNames(overrideConfig.vars)) {
            // Check if this variable is enabled for override
            const override = variableOverrides.find((v) => v.name === propertyName)
            if (!override?.enabled) {
                continue // Skip this variable if it's not enabled for override
            }

            const foundVar = availableVariables.find((v) => v.name === propertyName)
            if (foundVar) {
                // even if the variable was defined as runtime, we override it with static value
                foundVar.type = 'static'
                foundVar.value = overrideConfig.vars[propertyName]
            } else {
                // add it the variables, if not found locally in the db
                availableVariables.push({
                    name: propertyName,
                    type: 'static',
                    value: overrideConfig.vars[propertyName],
                    id: '',
                    updatedDate: new Date(),
                    createdDate: new Date()
                })
            }
        }
    }

    let vars = {}
    if (availableVariables.length) {
        for (const item of availableVariables) {
            let value = item.value

            // read from .env file
            if (item.type === 'runtime') {
                value = process.env[item.name] ?? ''
            }

            Object.defineProperty(vars, item.name, {
                enumerable: true,
                configurable: true,
                writable: true,
                value: value
            })
        }
    }
    return vars
}
