import CallbackHandler from 'langfuse-langchain'
import { Client } from 'langsmith'
import lunary from 'lunary'
import { Logger } from 'winston'

import { LunaryHandler } from '@langchain/community/callbacks/handlers/lunary'
import { AgentAction } from '@langchain/core/agents'
import { BaseTracer, Run } from '@langchain/core/tracers/base'
import { LangChainTracer, LangChainTracerFields } from '@langchain/core/tracers/tracer_langchain'
import { ChainValues } from '@langchain/core/utils/types'
import { LangWatch } from 'langwatch'
import { DataSource } from 'typeorm'
import { ICommonObject, IDatabaseEntity, INodeData } from './Interface'
import { getCredentialData, getCredentialParam, getEnvironmentVariable } from './utils'

interface AgentRun extends Run {
    actions: AgentAction[]
}

function tryGetJsonSpaces() {
    try {
        return parseInt(getEnvironmentVariable('LOG_JSON_SPACES') ?? '2')
    } catch (err) {
        return 2
    }
}

function tryJsonStringify(obj: unknown, fallback: string) {
    try {
        return JSON.stringify(obj, null, tryGetJsonSpaces())
    } catch (err) {
        return fallback
    }
}

function elapsed(run: Run): string {
    if (!run.end_time) return ''
    const elapsed = run.end_time - run.start_time
    if (elapsed < 1000) {
        return `${elapsed}ms`
    }
    return `${(elapsed / 1000).toFixed(2)}s`
}

class ExtendedLunaryHandler extends LunaryHandler {
    chatId: string
    appDataSource: DataSource
    databaseEntities: IDatabaseEntity
    currentRunId: string | null
    thread: any
    apiMessageId: string

    constructor({ flowiseOptions, ...options }: any) {
        super(options)
        this.appDataSource = flowiseOptions.appDataSource
        this.databaseEntities = flowiseOptions.databaseEntities
        this.chatId = flowiseOptions.chatId
        this.apiMessageId = flowiseOptions.apiMessageId
    }

    async initThread() {
        const entity = await this.appDataSource.getRepository(this.databaseEntities['Lead']).findOne({
            where: {
                chatId: this.chatId
            }
        })

        const userId = entity?.email ?? entity?.id

        this.thread = lunary.openThread({
            id: this.chatId,
            userId,
            userProps: userId
                ? {
                      name: entity?.name ?? undefined,
                      email: entity?.email ?? undefined,
                      phone: entity?.phone ?? undefined
                  }
                : undefined
        })
    }

    async handleChainStart(chain: any, inputs: any, runId: string, parentRunId?: string, tags?: string[], metadata?: any): Promise<void> {
        // First chain (no parent run id) is the user message
        if (this.chatId && !parentRunId) {
            if (!this.thread) {
                await this.initThread()
            }

            const messageText = inputs.input || inputs.question

            const messageId = this.thread.trackMessage({
                content: messageText,
                role: 'user'
            })

            // Track top level chain id for knowing when we got the final reply
            this.currentRunId = runId

            // Use the messageId as the parent of the chain for reconciliation
            super.handleChainStart(chain, inputs, runId, messageId, tags, metadata)
        } else {
            super.handleChainStart(chain, inputs, runId, parentRunId, tags, metadata)
        }
    }

    async handleChainEnd(outputs: ChainValues, runId: string): Promise<void> {
        if (this.chatId && runId === this.currentRunId) {
            const answer = outputs.output

            this.thread.trackMessage({
                id: this.apiMessageId,
                content: answer,
                role: 'assistant'
            })

            this.currentRunId = null
        }

        super.handleChainEnd(outputs, runId)
    }
}

export const additionalCallbacks = async (nodeData: INodeData, options: ICommonObject) => {
    try {
        if (!options.analytic) return []

        const analytic = JSON.parse(options.analytic)
        const callbacks: any = []

        for (const provider in analytic) {
            const providerStatus = analytic[provider].status as boolean
            if (providerStatus) {
                const credentialId = analytic[provider].credentialId as string
                const credentialData = await getCredentialData(credentialId ?? '', options)
                if (provider === 'langSmith') {
                    const langSmithProject = analytic[provider].projectName as string

                    const langSmithApiKey = getCredentialParam('langSmithApiKey', credentialData, nodeData)
                    const langSmithEndpoint = getCredentialParam('langSmithEndpoint', credentialData, nodeData)

                    const client = new Client({
                        apiUrl: langSmithEndpoint ?? 'https://api.smith.langchain.com',
                        apiKey: langSmithApiKey
                    })

                    let langSmithField: LangChainTracerFields = {
                        projectName: langSmithProject ?? 'default',
                        //@ts-ignore
                        client
                    }

                    if (nodeData?.inputs?.analytics?.langSmith) {
                        langSmithField = { ...langSmithField, ...nodeData?.inputs?.analytics?.langSmith }
                    }

                    const tracer = new LangChainTracer(langSmithField)
                    callbacks.push(tracer)
                } else if (provider === 'langFuse') {
                    const release = analytic[provider].release as string

                    const langFuseSecretKey = getCredentialParam('langFuseSecretKey', credentialData, nodeData)
                    const langFusePublicKey = getCredentialParam('langFusePublicKey', credentialData, nodeData)
                    const langFuseEndpoint = getCredentialParam('langFuseEndpoint', credentialData, nodeData)

                    let langFuseOptions: any = {
                        secretKey: langFuseSecretKey,
                        publicKey: langFusePublicKey,
                        baseUrl: langFuseEndpoint ?? 'https://cloud.langfuse.com',
                        sdkIntegration: 'Flowise'
                    }
                    if (release) langFuseOptions.release = release
                    if (options.chatId) langFuseOptions.sessionId = options.chatId

                    if (nodeData?.inputs?.analytics?.langFuse) {
                        langFuseOptions = { ...langFuseOptions, ...nodeData?.inputs?.analytics?.langFuse }
                    }

                    const handler = new CallbackHandler(langFuseOptions)
                    callbacks.push(handler)
                } else if (provider === 'lunary') {
                    const lunaryPublicKey = getCredentialParam('lunaryAppId', credentialData, nodeData)
                    const lunaryEndpoint = getCredentialParam('lunaryEndpoint', credentialData, nodeData)

                    let lunaryFields = {
                        publicKey: lunaryPublicKey,
                        apiUrl: lunaryEndpoint ?? 'https://api.lunary.ai',
                        runtime: 'flowise',
                        flowiseOptions: options
                    }

                    if (nodeData?.inputs?.analytics?.lunary) {
                        lunaryFields = { ...lunaryFields, ...nodeData?.inputs?.analytics?.lunary }
                    }

                    const handler = new ExtendedLunaryHandler(lunaryFields)

                    callbacks.push(handler)
                } else if (provider === 'langWatch') {
                    const langWatchApiKey = getCredentialParam('langWatchApiKey', credentialData, nodeData)
                    const langWatchEndpoint = getCredentialParam('langWatchEndpoint', credentialData, nodeData)

                    const langwatch = new LangWatch({
                        apiKey: langWatchApiKey,
                        endpoint: langWatchEndpoint
                    })

                    const trace = langwatch.getTrace()
                    callbacks.push(trace.getLangChainCallback())
                }
            }
        }
        return callbacks
    } catch (e) {
        throw new Error(e)
    }
}

export class ConsoleCallbackHandler extends BaseTracer {
    name = 'console_callback_handler' as const
    logger: Logger

    protected persistRun(_run: Run) {
        return Promise.resolve()
    }

    constructor(logger: Logger) {
        super()
        this.logger = logger
        if (getEnvironmentVariable('DEBUG') === 'true') {
            logger.level = getEnvironmentVariable('LOG_LEVEL') ?? 'info'
        }
    }

    getParents(run: Run) {
        const parents: Run[] = []
        let currentRun = run
        while (currentRun.parent_run_id) {
            const parent = this.runMap.get(currentRun.parent_run_id)
            if (parent) {
                parents.push(parent)
                currentRun = parent
            } else {
                break
            }
        }
        return parents
    }

    getBreadcrumbs(run: Run) {
        const parents = this.getParents(run).reverse()
        const string = [...parents, run]
            .map((parent) => {
                const name = `${parent.execution_order}:${parent.run_type}:${parent.name}`
                return name
            })
            .join(' > ')
        return string
    }

    onChainStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)

        this.logger.verbose(`[chain/start] [${crumbs}] Entering Chain run with input: ${tryJsonStringify(run.inputs, '[inputs]')}`)
    }

    onChainEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[chain/end] [${crumbs}] [${elapsed(run)}] Exiting Chain run with output: ${tryJsonStringify(run.outputs, '[outputs]')}`
        )
    }

    onChainError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[chain/error] [${crumbs}] [${elapsed(run)}] Chain run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onLLMStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        const inputs = 'prompts' in run.inputs ? { prompts: (run.inputs.prompts as string[]).map((p) => p.trim()) } : run.inputs
        this.logger.verbose(`[llm/start] [${crumbs}] Entering LLM run with input: ${tryJsonStringify(inputs, '[inputs]')}`)
    }

    onLLMEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[llm/end] [${crumbs}] [${elapsed(run)}] Exiting LLM run with output: ${tryJsonStringify(run.outputs, '[response]')}`
        )
    }

    onLLMError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[llm/error] [${crumbs}] [${elapsed(run)}] LLM run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onToolStart(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/start] [${crumbs}] Entering Tool run with input: "${run.inputs.input?.trim()}"`)
    }

    onToolEnd(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(`[tool/end] [${crumbs}] [${elapsed(run)}] Exiting Tool run with output: "${run.outputs?.output?.trim()}"`)
    }

    onToolError(run: Run) {
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[tool/error] [${crumbs}] [${elapsed(run)}] Tool run errored with error: ${tryJsonStringify(run.error, '[error]')}`
        )
    }

    onAgentAction(run: Run) {
        const agentRun = run as AgentRun
        const crumbs = this.getBreadcrumbs(run)
        this.logger.verbose(
            `[agent/action] [${crumbs}] Agent selected action: ${tryJsonStringify(
                agentRun.actions[agentRun.actions.length - 1],
                '[action]'
            )}`
        )
    }
}
