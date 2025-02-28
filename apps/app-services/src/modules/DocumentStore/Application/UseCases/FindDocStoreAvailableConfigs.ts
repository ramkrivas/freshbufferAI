import { StatusCodes } from 'http-status-codes'
import { FreshbufferAiError } from '../../../../core/Errors'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'
import { DocumentStore } from '../../../../core/Database/Entities/DocumentStore'
import { IDocumentStoreLoader } from '../../Domain'
import { INPUT_PARAMS_TYPE } from '../../../../utils/constants'
import { IOverrideConfig } from '../../../../core/Interfaces/Interfaces'

export const findDocStoreAvailableConfigs = async (storeId: string, docId: string) => {
    // find the document store
    const appServer = getRunningExpressApp()
    const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({ id: storeId })

    if (!entity) {
        throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Document store ${storeId} not found`)
    }

    const loaders = JSON.parse(entity.loaders)
    const loader = loaders.find((ldr: IDocumentStoreLoader) => ldr.id === docId)
    if (!loader) {
        throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Document loader ${docId} not found`)
    }

    const nodes = []
    const componentCredentials = appServer.nodesPool.componentCredentials

    const loaderName = loader.loaderId
    const loaderLabel = appServer.nodesPool.componentNodes[loaderName].label

    const loaderInputs =
        appServer.nodesPool.componentNodes[loaderName].inputs?.filter((input) => INPUT_PARAMS_TYPE.includes(input.type)) ?? []
    nodes.push({
        label: loaderLabel,
        nodeId: `${loaderName}_0`,
        inputParams: loaderInputs
    })

    const splitterName = loader.splitterId
    if (splitterName) {
        const splitterLabel = appServer.nodesPool.componentNodes[splitterName].label
        const splitterInputs =
            appServer.nodesPool.componentNodes[splitterName].inputs?.filter((input) => INPUT_PARAMS_TYPE.includes(input.type)) ?? []
        nodes.push({
            label: splitterLabel,
            nodeId: `${splitterName}_0`,
            inputParams: splitterInputs
        })
    }

    if (entity.vectorStoreConfig) {
        const vectorStoreName = JSON.parse(entity.vectorStoreConfig || '{}').name
        const vectorStoreLabel = appServer.nodesPool.componentNodes[vectorStoreName].label
        const vectorStoreInputs =
            appServer.nodesPool.componentNodes[vectorStoreName].inputs?.filter((input) => INPUT_PARAMS_TYPE.includes(input.type)) ?? []
        nodes.push({
            label: vectorStoreLabel,
            nodeId: `${vectorStoreName}_0`,
            inputParams: vectorStoreInputs
        })
    }

    if (entity.embeddingConfig) {
        const embeddingName = JSON.parse(entity.embeddingConfig || '{}').name
        const embeddingLabel = appServer.nodesPool.componentNodes[embeddingName].label
        const embeddingInputs =
            appServer.nodesPool.componentNodes[embeddingName].inputs?.filter((input) => INPUT_PARAMS_TYPE.includes(input.type)) ?? []
        nodes.push({
            label: embeddingLabel,
            nodeId: `${embeddingName}_0`,
            inputParams: embeddingInputs
        })
    }

    if (entity.recordManagerConfig) {
        const recordManagerName = JSON.parse(entity.recordManagerConfig || '{}').name
        const recordManagerLabel = appServer.nodesPool.componentNodes[recordManagerName].label
        const recordManagerInputs =
            appServer.nodesPool.componentNodes[recordManagerName].inputs?.filter((input) => INPUT_PARAMS_TYPE.includes(input.type)) ?? []
        nodes.push({
            label: recordManagerLabel,
            nodeId: `${recordManagerName}_0`,
            inputParams: recordManagerInputs
        })
    }

    const configs: IOverrideConfig[] = []
    for (const node of nodes) {
        const inputParams = node.inputParams
        for (const inputParam of inputParams) {
            let obj: IOverrideConfig
            if (inputParam.type === 'file') {
                obj = {
                    node: node.label,
                    nodeId: node.nodeId,
                    label: inputParam.label,
                    name: 'files',
                    type: inputParam.fileType ?? inputParam.type
                }
            } else if (inputParam.type === 'options') {
                obj = {
                    node: node.label,
                    nodeId: node.nodeId,
                    label: inputParam.label,
                    name: inputParam.name,
                    type: inputParam.options
                        ? inputParam.options
                              ?.map((option) => {
                                  return option.name
                              })
                              .join(', ')
                        : 'string'
                }
            } else if (inputParam.type === 'credential') {
                // get component credential inputs
                for (const name of inputParam.credentialNames ?? []) {
                    if (Object.prototype.hasOwnProperty.call(componentCredentials, name)) {
                        const inputs = componentCredentials[name]?.inputs ?? []
                        for (const input of inputs) {
                            obj = {
                                node: node.label,
                                nodeId: node.nodeId,
                                label: input.label,
                                name: input.name,
                                type: input.type === 'password' ? 'string' : input.type
                            }
                            configs.push(obj)
                        }
                    }
                }
                continue
            } else {
                obj = {
                    node: node.label,
                    nodeId: node.nodeId,
                    label: inputParam.label,
                    name: inputParam.name,
                    type: inputParam.type === 'password' ? 'string' : inputParam.type
                }
            }
            if (!configs.some((config) => JSON.stringify(config) === JSON.stringify(obj))) {
                configs.push(obj)
            }
        }
    }

    return configs
}
