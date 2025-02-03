import { StatusCodes } from 'http-status-codes'
import { DocumentStore } from '../../../../core/database/entities/DocumentStore'
import { InternalFreshbufferAiError } from '../../../../core/errors/internalFreshbufferAiError'
import { getErrorMessage } from '../../../../core/errors/utils'
import { getRunningExpressApp } from '../../../../utils/getRunningExpressApp'

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
