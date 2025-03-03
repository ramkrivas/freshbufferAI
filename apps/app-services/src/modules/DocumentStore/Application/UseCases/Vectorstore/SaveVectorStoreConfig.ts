import { StatusCodes } from 'http-status-codes'
import { DocumentStore } from '../../../../../core/Database/Entities/DocumentStore'
import { FreshbufferAiError } from '../../../../../core/Errors'
import { getErrorMessage } from '../../../../../core/Errors/Utils'
import { getRunningExpressApp } from '../../../../../utils/Server/getRunningExpressApp'
import { DocumentStoreStatus, ICommonObject } from '../../../Domain'

export const saveVectorStoreConfig = async (data: ICommonObject, isStrictSave = true) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: data.storeId
        })
        if (!entity) {
            throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Document store ${data.storeId} not found`)
        }

        if (data.embeddingName) {
            entity.embeddingConfig = JSON.stringify({
                config: data.embeddingConfig,
                name: data.embeddingName
            })
        } else if (entity.embeddingConfig && !data.embeddingName && !data.embeddingConfig) {
            data.embeddingConfig = JSON.parse(entity.embeddingConfig)?.config
            data.embeddingName = JSON.parse(entity.embeddingConfig)?.name
            if (isStrictSave) entity.embeddingConfig = null
        } else if (!data.embeddingName && !data.embeddingConfig) {
            entity.embeddingConfig = null
        }

        if (data.vectorStoreName) {
            entity.vectorStoreConfig = JSON.stringify({
                config: data.vectorStoreConfig,
                name: data.vectorStoreName
            })
        } else if (entity.vectorStoreConfig && !data.vectorStoreName && !data.vectorStoreConfig) {
            data.vectorStoreConfig = JSON.parse(entity.vectorStoreConfig)?.config
            data.vectorStoreName = JSON.parse(entity.vectorStoreConfig)?.name
            if (isStrictSave) entity.vectorStoreConfig = null
        } else if (!data.vectorStoreName && !data.vectorStoreConfig) {
            entity.vectorStoreConfig = null
        }

        if (data.recordManagerName) {
            entity.recordManagerConfig = JSON.stringify({
                config: data.recordManagerConfig,
                name: data.recordManagerName
            })
        } else if (entity.recordManagerConfig && !data.recordManagerName && !data.recordManagerConfig) {
            data.recordManagerConfig = JSON.parse(entity.recordManagerConfig)?.config
            data.recordManagerName = JSON.parse(entity.recordManagerConfig)?.name
            if (isStrictSave) entity.recordManagerConfig = null
        } else if (!data.recordManagerName && !data.recordManagerConfig) {
            entity.recordManagerConfig = null
        }

        if (entity.status !== DocumentStoreStatus.UPSERTED && (data.vectorStoreName || data.recordManagerName || data.embeddingName)) {
            // if the store is not already in sync, mark it as sync
            // this also means that the store is not yet sync'ed to vector store
            entity.status = DocumentStoreStatus.SYNC
        }
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
        return entity
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.saveVectorStoreConfig - ${getErrorMessage(error)}`
        )
    }
}
