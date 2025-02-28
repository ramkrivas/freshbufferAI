import { Document } from '@langchain/core/documents'
import { StatusCodes } from 'http-status-codes'
import { cloneDeep, omit } from 'lodash'
import { App } from '../../../../..'
import { databaseEntities } from '../../../../../core/Database/Constants'
import { DocumentStore } from '../../../../../core/Database/Entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../../../../core/Database/Entities/DocumentStoreFileChunk'
import { UpsertHistory } from '../../../../../core/Database/Entities/UpsertHistory'
import { FreshbufferAiError } from '../../../../../core/Errors'
import { getErrorMessage } from '../../../../../core/Errors/Utils'
import { INodeData } from '../../../../../core/Interfaces/Interfaces'
import logger from '../../../../../core/Logger'
import { saveUpsertFlowData } from '../../../../../utils'
import { getRunningExpressApp } from '../../../../../utils/Server/getRunningExpressApp'
import { DocumentStoreStatus, ICommonObject } from '../../../Domain'
import { saveVectorStoreConfig } from './SaveVectorStoreConfig'

export const insertIntoVectorStore = async (data: ICommonObject, isStrictSave = true) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await saveVectorStoreConfig(data, isStrictSave)
        entity.status = DocumentStoreStatus.UPSERTING
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)

        // TODO: to be moved into a worker thread...
        const indexResult = await _insertIntoVectorStoreWorkerThread(data, isStrictSave)
        return indexResult
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.insertIntoVectorStore - ${getErrorMessage(error)}`
        )
    }
}

export const _insertIntoVectorStoreWorkerThread = async (data: ICommonObject, isStrictSave = true) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await saveVectorStoreConfig(data, isStrictSave)
        let upsertHistory: Record<string, any> = {}
        const chatflowid = data.storeId // fake chatflowid because this is not tied to any chatflow

        const options: ICommonObject = {
            chatflowid,
            appDataSource: appServer.AppDataSource,
            databaseEntities,
            logger
        }

        let recordManagerObj = undefined

        // Get Record Manager Instance
        if (data.recordManagerName && data.recordManagerConfig) {
            recordManagerObj = await _createRecordManagerObject(appServer, data, options, upsertHistory)
        }

        // Get Embeddings Instance
        const embeddingObj = await _createEmbeddingsObject(appServer, data, options, upsertHistory)

        // Get Vector Store Node Data
        const vStoreNodeData = _createVectorStoreNodeData(appServer, data, embeddingObj, recordManagerObj)

        // Prepare docs for upserting
        const filterOptions: ICommonObject = {
            storeId: data.storeId
        }
        if (data.docId) {
            filterOptions['docId'] = data.docId
        }
        const chunks = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).find({
            where: filterOptions
        })
        const docs: Document[] = chunks.map((chunk: DocumentStoreFileChunk) => {
            return new Document({
                pageContent: chunk.pageContent,
                metadata: JSON.parse(chunk.metadata)
            })
        })
        vStoreNodeData.inputs.document = docs

        // Get Vector Store Instance
        const vectorStoreObj = await _createVectorStoreObject(appServer, data, vStoreNodeData, upsertHistory)
        const indexResult = await vectorStoreObj.vectorStoreMethods.upsert(vStoreNodeData, options)

        // Save to DB
        if (indexResult) {
            const result = cloneDeep(upsertHistory)
            result['flowData'] = JSON.stringify(result['flowData'])
            result['result'] = JSON.stringify(omit(indexResult, ['totalKeys', 'addedDocs']))
            result.chatflowid = chatflowid
            const newUpsertHistory = new UpsertHistory()
            Object.assign(newUpsertHistory, result)
            const upsertHistoryItemtemp = appServer.AppDataSource.getRepository(UpsertHistory)
            const upsertHistoryItem = upsertHistoryItemtemp.create(newUpsertHistory)
            await appServer.AppDataSource.getRepository(UpsertHistory).save(upsertHistoryItem)
        }

        entity.status = DocumentStoreStatus.UPSERTED
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)

        return indexResult ?? { result: 'Successfully Upserted' }
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices._insertIntoVectorStoreWorkerThread - ${getErrorMessage(error)}`
        )
    }
}

export const _createEmbeddingsObject = async (
    appServer: App,
    data: ICommonObject,
    options: ICommonObject,
    upsertHistory?: Record<string, any>
): Promise<any> => {
    // prepare embedding node data
    const embeddingComponent = appServer.nodesPool.componentNodes[data.embeddingName]
    const embeddingNodeData: any = {
        inputs: { ...data.embeddingConfig },
        outputs: { output: 'document' },
        id: `${embeddingComponent.name}_0`,
        label: embeddingComponent.label,
        name: embeddingComponent.name,
        category: embeddingComponent.category,
        inputParams: embeddingComponent.inputs || []
    }
    if (data.embeddingConfig.credential) {
        embeddingNodeData.credential = data.embeddingConfig.credential
    }

    // save to upsert history
    if (upsertHistory) upsertHistory['flowData'] = saveUpsertFlowData(embeddingNodeData, upsertHistory)

    // init embedding object
    const embeddingNodeInstanceFilePath = embeddingComponent.filePath as string
    const embeddingNodeModule = await import(embeddingNodeInstanceFilePath)
    const embeddingNodeInstance = new embeddingNodeModule.nodeClass()
    const embeddingObj = await embeddingNodeInstance.init(embeddingNodeData, '', options)
    if (!embeddingObj) {
        throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create EmbeddingObj`)
    }
    return embeddingObj
}

export const _createRecordManagerObject = async (
    appServer: App,
    data: ICommonObject,
    options: ICommonObject,
    upsertHistory?: Record<string, any>
) => {
    // prepare record manager node data
    const recordManagerComponent = appServer.nodesPool.componentNodes[data.recordManagerName]
    const rmNodeData: any = {
        inputs: { ...data.recordManagerConfig },
        id: `${recordManagerComponent.name}_0`,
        inputParams: recordManagerComponent.inputs,
        label: recordManagerComponent.label,
        name: recordManagerComponent.name,
        category: recordManagerComponent.category
    }
    if (data.recordManagerConfig.credential) {
        rmNodeData.credential = data.recordManagerConfig.credential
    }

    // save to upsert history
    if (upsertHistory) upsertHistory['flowData'] = saveUpsertFlowData(rmNodeData, upsertHistory)

    // init record manager object
    const rmNodeInstanceFilePath = recordManagerComponent.filePath as string
    const rmNodeModule = await import(rmNodeInstanceFilePath)
    const rmNodeInstance = new rmNodeModule.nodeClass()
    const recordManagerObj = await rmNodeInstance.init(rmNodeData, '', options)
    if (!recordManagerObj) {
        throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create RecordManager obj`)
    }
    return recordManagerObj
}

export const _createVectorStoreNodeData = (appServer: App, data: ICommonObject, embeddingObj: any, recordManagerObj?: any) => {
    const vectorStoreComponent = appServer.nodesPool.componentNodes[data.vectorStoreName]
    const vStoreNodeData: any = {
        id: `${vectorStoreComponent.name}_0`,
        inputs: { ...data.vectorStoreConfig },
        outputs: { output: 'retriever' },
        label: vectorStoreComponent.label,
        name: vectorStoreComponent.name,
        category: vectorStoreComponent.category
    }
    if (data.vectorStoreConfig.credential) {
        vStoreNodeData.credential = data.vectorStoreConfig.credential
    }

    if (embeddingObj) {
        vStoreNodeData.inputs.embeddings = embeddingObj
    }

    if (recordManagerObj) {
        vStoreNodeData.inputs.recordManager = recordManagerObj
    }

    // Get all input params except the ones that are anchor points to avoid JSON stringify circular error
    const filterInputParams = ['document', 'embeddings', 'recordManager']
    const inputParams = vectorStoreComponent.inputs?.filter((input) => !filterInputParams.includes(input.name))
    vStoreNodeData.inputParams = inputParams
    return vStoreNodeData
}

export const _createVectorStoreObject = async (
    appServer: App,
    data: ICommonObject,
    vStoreNodeData: INodeData,
    upsertHistory?: Record<string, any>
) => {
    const vStoreNodeInstanceFilePath = appServer.nodesPool.componentNodes[data.vectorStoreName].filePath as string
    const vStoreNodeModule = await import(vStoreNodeInstanceFilePath)
    const vStoreNodeInstance = new vStoreNodeModule.nodeClass()
    if (upsertHistory) upsertHistory['flowData'] = saveUpsertFlowData(vStoreNodeData, upsertHistory)
    return vStoreNodeInstance
}
