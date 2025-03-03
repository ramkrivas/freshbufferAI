import { IDocument } from 'core-plugins'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { databaseEntities } from '../../../../../core/Database/Constants'
import { DocumentStore } from '../../../../../core/Database/Entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../../../../core/Database/Entities/DocumentStoreFileChunk'
import { FreshbufferAiError } from '../../../../../core/Errors'
import { getErrorMessage } from '../../../../../core/Errors/Utils'
import logger from '../../../../../core/Logger'
import { getRunningExpressApp } from '../../../../../utils/Server/getRunningExpressApp'
import { ICommonObject } from '../../../Domain'
import { _createEmbeddingsObject, _createVectorStoreNodeData, _createVectorStoreObject } from './InsertIntoVectorStore'

export const queryVectorStore = async (data: ICommonObject) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: data.storeId
        })
        if (!entity) {
            throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Document store ${data.storeId} not found`)
        }
        const options: ICommonObject = {
            chatflowid: uuidv4(),
            appDataSource: appServer.AppDataSource,
            databaseEntities,
            logger
        }

        if (!entity.embeddingConfig) {
            throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Embedding for ${data.storeId} is not configured`)
        }

        if (!entity.vectorStoreConfig) {
            throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Vector Store for ${data.storeId} is not configured`)
        }

        const embeddingConfig = JSON.parse(entity.embeddingConfig)
        data.embeddingName = embeddingConfig.name
        data.embeddingConfig = embeddingConfig.config
        let embeddingObj = await _createEmbeddingsObject(appServer, data, options)

        const vsConfig = JSON.parse(entity.vectorStoreConfig)
        data.vectorStoreName = vsConfig.name
        data.vectorStoreConfig = vsConfig.config
        if (data.inputs) {
            data.vectorStoreConfig = { ...vsConfig.config, ...data.inputs }
        }

        const vStoreNodeData = _createVectorStoreNodeData(appServer, data, embeddingObj, undefined)

        // Get Vector Store Instance
        const vectorStoreObj = await _createVectorStoreObject(appServer, data, vStoreNodeData)
        const retriever = await vectorStoreObj.init(vStoreNodeData, '', options)
        if (!retriever) {
            throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to create retriever`)
        }
        const startMillis = Date.now()
        const results = await retriever.invoke(data.query, undefined)
        if (!results) {
            throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to retrieve results`)
        }
        const endMillis = Date.now()
        const timeTaken = endMillis - startMillis
        const docs: any = results.map((result: IDocument) => {
            return {
                pageContent: result.pageContent,
                metadata: result.metadata,
                id: uuidv4()
            }
        })
        // query our document store chunk with the storeId and pageContent
        for (const doc of docs) {
            const documentStoreChunk = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).findOneBy({
                storeId: data.storeId,
                pageContent: doc.pageContent
            })
            if (documentStoreChunk) {
                doc.id = documentStoreChunk.id
                doc.chunkNo = documentStoreChunk.chunkNo
            } else {
                // this should not happen, only possible if the vector store has more content
                // than our document store
                doc.id = uuidv4()
                doc.chunkNo = -1
            }
        }

        return {
            timeTaken: timeTaken,
            docs: docs
        }
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.queryVectorStore - ${getErrorMessage(error)}`
        )
    }
}
