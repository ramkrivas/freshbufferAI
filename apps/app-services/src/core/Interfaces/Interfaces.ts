import { INodeData as INodeDataFromComponent, INodeParams, INode } from 'core-plugins'
import { ICommonObject } from 'core-plugins'
export type ChatflowType = 'CHATFLOW' | 'MULTIAGENT' | 'ASSISTANT'
export type MessageType = 'apiMessage' | 'userMessage'
import { DataSource } from 'typeorm'
import { CachePool } from '@app-services/utils/CachePool'
export interface IChatFlow {
    id: string
    name: string
    flowData: string
    updatedDate: Date
    createdDate: Date
    deployed?: boolean
    isPublic?: boolean
    apikeyid?: string
    analytic?: string
    chatbotConfig?: string
    followUpPrompts?: string
    apiConfig?: string
    category?: string
    type?: ChatflowType
}
export enum ChatMessageRatingType {
    THUMBS_UP = 'THUMBS_UP',
    THUMBS_DOWN = 'THUMBS_DOWN'
}

export interface IUploadFileSizeAndTypes {
    fileTypes: string[]
    maxUploadSize: number
}

export interface IChatMessageFeedback {
    id: string
    content?: string
    chatflowid: string
    chatId: string
    messageId: string
    rating: ChatMessageRatingType
    createdDate: Date
}

export enum ChatType {
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL'
}
export interface IDepthQueue {
    [key: string]: number
}

export interface IChatMessage {
    id: string
    role: MessageType
    content: string
    chatflowid: string
    sourceDocuments?: string
    usedTools?: string
    fileAnnotations?: string
    agentReasoning?: string
    fileUploads?: string
    artifacts?: string
    chatType: string
    chatId: string
    memoryType?: string
    sessionId?: string
    createdDate: Date
    leadEmail?: string
    action?: string | null
    followUpPrompts?: string
}

export interface IMessage {
    message: string
    type: MessageType
    role?: MessageType
    content?: string
}
export interface IComponentNodes {
    [key: string]: INode
}
export interface IFileUpload {
    data?: string
    type: string
    name: string
    mime: string
}
export interface IncomingInput {
    question: string
    overrideConfig?: ICommonObject
    chatId?: string
    stopNodeId?: string
    uploads?: IFileUpload[]
    leadEmail?: string
    history?: IMessage[]
    action?: IAction
}

export interface IOverrideConfig {
    node: string
    nodeId: string
    label: string
    name: string
    type: string
}

export interface IAction {
    id?: string
    elements?: Array<{
        type: string
        label: string
    }>
    mapping?: {
        approve: string
        reject: string
        toolCalls: any[]
    }
}
export interface INodeData extends INodeDataFromComponent {
    inputAnchors: INodeParams[]
    inputParams: INodeParams[]
    outputAnchors: INodeParams[]
}
export interface IUpsertHistory {
    id: string
    chatflowid: string
    result: string
    flowData: string
    date: Date
}
export interface IReactFlowNode {
    id: string
    position: {
        x: number
        y: number
    }
    type: string
    data: INodeData
    positionAbsolute: {
        x: number
        y: number
    }
    z: number
    handleBounds: {
        source: any
        target: any
    }
    width: number
    height: number
    selected: boolean
    dragging: boolean
}

export interface IReactFlowEdge {
    source: string
    sourceHandle: string
    target: string
    targetHandle: string
    type: string
    id: string
    data: {
        label: string
    }
}

export interface IReactFlowObject {
    nodes: IReactFlowNode[]
    edges: IReactFlowEdge[]
    viewport: {
        x: number
        y: number
        zoom: number
    }
}
export interface INodeDirectedGraph {
    [key: string]: string[]
}

export type BuildFlowParams = {
    startingNodeIds: string[]
    reactFlowNodes: IReactFlowNode[]
    reactFlowEdges: IReactFlowEdge[]
    graph: INodeDirectedGraph
    depthQueue: IDepthQueue
    componentNodes: IComponentNodes
    question: string
    chatHistory: IMessage[]
    chatId: string
    sessionId: string
    chatflowid: string
    apiMessageId: string
    appDataSource: DataSource
    overrideConfig?: ICommonObject
    apiOverrideStatus?: boolean
    nodeOverrides?: INodeOverrides
    availableVariables?: IVariable[]
    variableOverrides?: IVariableOverride[]
    cachePool?: CachePool
    isUpsert?: boolean
    stopNodeId?: string
    uploads?: IFileUpload[]
    baseURL?: string
    uploadedFilesContent?: string
}

export interface INodeOverrides {
    [key: string]: {
        label: string
        name: string
        type: string
        enabled: boolean
    }[]
}

export interface IVariableOverride {
    id: string
    name: string
    type: 'static' | 'runtime'
    enabled: boolean
}

export interface IVariable {
    id: string
    name: string
    value: string
    type: string
    updatedDate: Date
    createdDate: Date
}

export interface IActiveCache {
    [key: string]: Map<any, any>
}

export interface INodeQueue {
    nodeId: string
    depth: number
}

export interface IExploredNode {
    [key: string]: {
        remainingLoop: number
        lastSeenDepth: number
    }
}
export interface INodeDependencies {
    [key: string]: number
}
export interface IActiveChatflows {
    [key: string]: {
        startingNodes: IReactFlowNode[]
        endingNodeData?: INodeData
        inSync: boolean
        overrideConfig?: ICommonObject
        chatId?: string
    }
}

export interface IVariableDict {
    [key: string]: string
}
