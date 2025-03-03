import { NextFunction, Request, Response } from 'express'
import { getDocumentLoaders } from '../Application/UseCases/GetLoaders'
import { FreshbufferAiError } from '../../../core/Errors'
import { StatusCodes } from 'http-status-codes'
import { previewChunks } from '../Application/UseCases/PostLoadersPreview'
import { saveProcessingLoader } from '../Application/UseCases/SaveProcessingLoader'
import { processLoader } from '../Application/UseCases/ProcessLoader'
import { getDocumentStoreFileChunks } from '../Application/UseCases/GetDocumentStoreFileChunks'
import { DocumentStoreDTO } from '../Domain'
import { deleteLoaderFromDocumentStore } from '../Application/UseCases/DeleteLoaderFromDocumentStore'
import { editDocumentStoreFileChunk } from '../Application/UseCases/EditDocumentStoreFileChunk'
import { deleteDocumentStoreFileChunk } from '../Application/UseCases/DeleteDocumentStoreFileChunk'

const getDocumentLoadersService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getDocumentLoaders()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const previewFileChunks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.previewFileChunks - body not provided!`
            )
        }
        const body = req.body
        body.preview = true
        const apiResponse = await previewChunks(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const saveProcessingLoaderService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.saveProcessingLoader - body not provided!`
            )
        }
        const body = req.body
        const apiResponse = await saveProcessingLoader(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const processLoaderService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.loaderId === 'undefined' || req.params.loaderId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.processLoader - loaderId not provided!`
            )
        }
        if (typeof req.body === 'undefined') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.processLoader - body not provided!`
            )
        }
        const docLoaderId = req.params.loaderId
        const body = req.body
        const apiResponse = await processLoader(body, docLoaderId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getDocumentStoreFileChunksService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.storeId === 'undefined' || req.params.storeId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.getDocumentStoreFileChunks - storeId not provided!`
            )
        }
        if (typeof req.params.fileId === 'undefined' || req.params.fileId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.getDocumentStoreFileChunks - fileId not provided!`
            )
        }
        const page = req.params.pageNo ? parseInt(req.params.pageNo) : 1
        const apiResponse = await getDocumentStoreFileChunks(req.params.storeId, req.params.fileId, page)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteLoaderFromDocumentStoreService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const storeId = req.params.id
        const loaderId = req.params.loaderId

        if (!storeId || !loaderId) {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.deleteLoaderFromDocumentStore - missing storeId or loaderId.`
            )
        }
        const apiResponse = await deleteLoaderFromDocumentStore(storeId, loaderId)
        return res.json(DocumentStoreDTO.fromEntity(apiResponse))
    } catch (error) {
        next(error)
    }
}

const editDocumentStoreFileChunkService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.storeId === 'undefined' || req.params.storeId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.editDocumentStoreFileChunk - storeId not provided!`
            )
        }
        if (typeof req.params.loaderId === 'undefined' || req.params.loaderId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.editDocumentStoreFileChunk - loaderId not provided!`
            )
        }
        if (typeof req.params.chunkId === 'undefined' || req.params.chunkId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.editDocumentStoreFileChunk - chunkId not provided!`
            )
        }
        const body = req.body
        if (typeof body === 'undefined') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.editDocumentStoreFileChunk - body not provided!`
            )
        }
        const apiResponse = await editDocumentStoreFileChunk(
            req.params.storeId,
            req.params.loaderId,
            req.params.chunkId,
            body.pageContent,
            body.metadata
        )
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}
const deleteDocumentStoreFileChunkService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.storeId === 'undefined' || req.params.storeId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.deleteDocumentStoreFileChunk - storeId not provided!`
            )
        }
        if (typeof req.params.loaderId === 'undefined' || req.params.loaderId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.deleteDocumentStoreFileChunk - loaderId not provided!`
            )
        }
        if (typeof req.params.chunkId === 'undefined' || req.params.chunkId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.deleteDocumentStoreFileChunk - chunkId not provided!`
            )
        }
        const apiResponse = await deleteDocumentStoreFileChunk(req.params.storeId, req.params.loaderId, req.params.chunkId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getDocumentLoadersService,
    previewFileChunks,
    saveProcessingLoaderService,
    processLoaderService,
    getDocumentStoreFileChunksService,
    deleteLoaderFromDocumentStoreService,
    editDocumentStoreFileChunkService,
    deleteDocumentStoreFileChunkService
}
