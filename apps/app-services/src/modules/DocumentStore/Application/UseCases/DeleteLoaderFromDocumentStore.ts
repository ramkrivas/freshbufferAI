import { StatusCodes } from 'http-status-codes'
import { DocumentStore } from '../../../../core/Database/Entities/DocumentStore'
import { FreshbufferAiError } from '../../../../core/Errors'
import { getErrorMessage } from '../../../../core/Errors/Utils'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'
import { IDocumentStoreLoader } from '../../Domain'
import { DocumentStoreFileChunk } from '../../../../core/Database/Entities/DocumentStoreFileChunk'
import { DOCUMENT_STORE_BASE_FOLDER } from './PostLoadersPreview'
import { removeSpecificFileFromStorage } from 'core-plugins'

export const deleteLoaderFromDocumentStore = async (storeId: string, docId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new FreshbufferAiError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreServices.deleteLoaderFromDocumentStore - Document store ${storeId} not found`
            )
        }
        const existingLoaders = JSON.parse(entity.loaders)
        const found = existingLoaders.find((loader: IDocumentStoreLoader) => loader.id === docId)
        if (found) {
            if (found.files?.length) {
                for (const file of found.files) {
                    if (file.name) {
                        try {
                            await removeSpecificFileFromStorage(DOCUMENT_STORE_BASE_FOLDER, storeId, file.name)
                        } catch (error) {
                            console.error(error)
                        }
                    }
                }
            }
            const index = existingLoaders.indexOf(found)
            if (index > -1) {
                existingLoaders.splice(index, 1)
            }
            // remove the chunks
            await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: found.id })

            entity.loaders = JSON.stringify(existingLoaders)
            const results = await appServer.AppDataSource.getRepository(DocumentStore).save(entity)
            return results
        } else {
            throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Unable to locate loader in Document Store ${entity.name}`)
        }
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.deleteLoaderFromDocumentStore - ${getErrorMessage(error)}`
        )
    }
}
