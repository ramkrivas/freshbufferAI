import { StatusCodes } from 'http-status-codes'
import { DocumentStore } from '../../../../core/Database/Entities/DocumentStore'
import { FreshbufferAiError } from '../../../../core/Errors'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'
import { getErrorMessage } from '../../../../core/Errors/Utils'

// Update documentStore
export const updateDocumentStore = async (documentStore: DocumentStore, updatedDocumentStore: DocumentStore) => {
    try {
        const appServer = getRunningExpressApp()
        const tmpUpdatedDocumentStore = appServer.AppDataSource.getRepository(DocumentStore).merge(documentStore, updatedDocumentStore)
        const dbResponse = await appServer.AppDataSource.getRepository(DocumentStore).save(tmpUpdatedDocumentStore)
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.updateDocumentStore - ${getErrorMessage(error)}`
        )
    }
}
