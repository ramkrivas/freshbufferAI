import { StatusCodes } from 'http-status-codes'
import { DocumentStore } from '../../../../core/Database/Entities/DocumentStore'
import { FreshbufferAiError } from '../../../../core/Errors'
import { getErrorMessage } from '../../../../core/Errors/Utils'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'

export const deleteDocumentStore = async (storeId: string) => {
    try {
        const appServer = getRunningExpressApp()

        // now delete the store
        const tbd = await appServer.AppDataSource.getRepository(DocumentStore).delete({
            id: storeId
        })

        return { deleted: tbd.affected }
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.deleteDocumentStore - ${getErrorMessage(error)}`
        )
    }
}
