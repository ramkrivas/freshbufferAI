import { StatusCodes } from 'http-status-codes'
import { FreshbufferAiError } from '../../../../core/Errors'
import { getErrorMessage } from '../../../../core/Errors/Utils'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'
import { DocumentStore } from '../../../../core/Database/Entities/DocumentStore'
import { IDocumentStoreFileChunkPagedResponse, IDocumentStoreLoader } from '../../Domain'
import { DocumentStoreFileChunk } from '../../../../core/Database/Entities/DocumentStoreFileChunk'

const getDocumentStoreFileChunks = async (storeId: string, docId: string, pageNo: number = 1) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: storeId
        })
        if (!entity) {
            throw new FreshbufferAiError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreServices.getDocumentStoreById - Document store ${storeId} not found`
            )
        }
        const loaders = JSON.parse(entity.loaders)

        let found: IDocumentStoreLoader | undefined
        if (docId !== 'all') {
            found = loaders.find((loader: IDocumentStoreLoader) => loader.id === docId)
            if (!found) {
                throw new FreshbufferAiError(
                    StatusCodes.NOT_FOUND,
                    `Error: documentStoreServices.getDocumentStoreById - Document loader ${docId} not found`
                )
            }
        }
        if (found) {
            found.id = docId
            found.status = entity.status
        }

        let characters = 0
        if (docId === 'all') {
            loaders.forEach((loader: IDocumentStoreLoader) => {
                characters += loader.totalChars || 0
            })
        } else {
            characters = found?.totalChars || 0
        }

        const PAGE_SIZE = 50
        const skip = (pageNo - 1) * PAGE_SIZE
        const take = PAGE_SIZE
        let whereCondition: any = { docId: docId }
        if (docId === 'all') {
            whereCondition = { storeId: storeId }
        }
        const count = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).count({
            where: whereCondition
        })
        const chunksWithCount = await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).find({
            skip,
            take,
            where: whereCondition,
            order: {
                chunkNo: 'ASC'
            }
        })

        if (!chunksWithCount) {
            throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Chunks with docId: ${docId} not found`)
        }

        const response: IDocumentStoreFileChunkPagedResponse = {
            chunks: chunksWithCount,
            count: count,
            file: found,
            currentPage: pageNo,
            storeName: entity.name,
            description: entity.description,
            docId: docId,
            characters
        }
        return response
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getDocumentStoreFileChunks - ${getErrorMessage(error)}`
        )
    }
}

export { getDocumentStoreFileChunks }
