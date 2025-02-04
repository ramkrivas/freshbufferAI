import { StatusCodes } from 'http-status-codes'
import { DocumentStore } from '../../../../core/Database/Entities/DocumentStore'
import { InternalFreshbufferAiError } from '../../../../core/Errors/internalFreshbufferAiError'
import { getErrorMessage } from '../../../../core/Errors/Utils'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'

export default async (newDocumentStore: DocumentStore) => {
    try {
        const appServer = getRunningExpressApp()
        const documentStoreRepository = appServer.AppDataSource.getRepository(DocumentStore)
        const documentStore = documentStoreRepository.create(newDocumentStore)
        const dbResponse = await documentStoreRepository.save(documentStore)
        return dbResponse
    } catch (error) {
        throw new InternalFreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.createDocumentStore - ${getErrorMessage(error)}`
        )
    }
}
