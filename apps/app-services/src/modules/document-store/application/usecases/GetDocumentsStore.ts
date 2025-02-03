import { StatusCodes } from 'http-status-codes'
import { DocumentStore } from '../../../../core/database/entities/DocumentStore'
import { InternalFreshbufferAiError } from '../../../../core/errors/internalFreshbufferAiError'
import { getErrorMessage } from '../../../../core/errors/utils'
import { getRunningExpressApp } from '../../../../utils/getRunningExpressApp'
import { DocumentStoreFileChunk } from '../../../../core/database/entities/DocumentStoreFileChunk'

const getAllDocumentStores = async () => {
    try {
        const appServer = getRunningExpressApp()
        const entities = await appServer.AppDataSource.getRepository(DocumentStore).find()
        return entities
    } catch (error) {
        throw new InternalFreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getAllDocumentStores - ${getErrorMessage(error)}`
        )
    }
}

const getDocumentStoreById = async (storeId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new InternalFreshbufferAiError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreServices.getDocumentStoreById - Document store ${storeId} not found`
            )
        }
        return entity
    } catch (error) {
        throw new InternalFreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getDocumentStoreById - ${getErrorMessage(error)}`
        )
    }
}

const getAllDocumentFileChunks = async () => {
    try {
        const appServer = getRunningExpressApp()
        const entities = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).find()
        return entities
    } catch (error) {
        throw new InternalFreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getAllDocumentFileChunks - ${getErrorMessage(error)}`
        )
    }
}

export { getAllDocumentStores, getDocumentStoreById, getAllDocumentFileChunks }
