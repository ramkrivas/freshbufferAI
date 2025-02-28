import { StatusCodes } from 'http-status-codes'
import { databaseEntities } from '../../../../../core/Database/Constants'
import { DocumentStore } from '../../../../../core/Database/Entities/DocumentStore'
import { FreshbufferAiError } from '../../../../../core/Errors'
import { getErrorMessage } from '../../../../../core/Errors/Utils'
import logger from '../../../../../core/Logger'
import { getRunningExpressApp } from '../../../../../utils/Server/getRunningExpressApp'
import { ICommonObject } from '../../../Domain'
import {
    _createEmbeddingsObject,
    _createRecordManagerObject,
    _createVectorStoreNodeData,
    _createVectorStoreObject
} from './InsertIntoVectorStore'

export const deleteVectorStoreFromStore = async (storeId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Document store ${storeId} not found`)
        }

        if (!entity.embeddingConfig) {
            throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Embedding for Document store ${storeId} not found`)
        }

        if (!entity.vectorStoreConfig) {
            throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Vector Store for Document store ${storeId} not found`)
        }

        if (!entity.recordManagerConfig) {
            throw new FreshbufferAiError(
                StatusCodes.NOT_FOUND,
                `Record Manager for Document Store ${storeId} is needed to delete data from Vector Store`
            )
        }

        const options: ICommonObject = {
            chatflowid: storeId,
            appDataSource: appServer.AppDataSource,
            databaseEntities,
            logger
        }

        // Get Record Manager Instance
        const recordManagerConfig = JSON.parse(entity.recordManagerConfig)
        const recordManagerObj = await _createRecordManagerObject(
            appServer,
            { recordManagerName: recordManagerConfig.name, recordManagerConfig: recordManagerConfig.config },
            options
        )

        // Get Embeddings Instance
        const embeddingConfig = JSON.parse(entity.embeddingConfig)
        const embeddingObj = await _createEmbeddingsObject(
            appServer,
            { embeddingName: embeddingConfig.name, embeddingConfig: embeddingConfig.config },
            options
        )

        // Get Vector Store Node Data
        const vectorStoreConfig = JSON.parse(entity.vectorStoreConfig)
        const vStoreNodeData = _createVectorStoreNodeData(
            appServer,
            { vectorStoreName: vectorStoreConfig.name, vectorStoreConfig: vectorStoreConfig.config },
            embeddingObj,
            recordManagerObj
        )

        // Get Vector Store Instance
        const vectorStoreObj = await _createVectorStoreObject(
            appServer,
            { vectorStoreName: vectorStoreConfig.name, vectorStoreConfig: vectorStoreConfig.config },
            vStoreNodeData
        )
        const idsToDelete: string[] = [] // empty ids because we get it dynamically from the record manager

        // Call the delete method of the vector store
        if (vectorStoreObj.vectorStoreMethods.delete) {
            await vectorStoreObj.vectorStoreMethods.delete(vStoreNodeData, idsToDelete, options)
        }
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.deleteVectorStoreFromStore - ${getErrorMessage(error)}`
        )
    }
}
