import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { FreshbufferAiError } from '../../../core/Errors'
import { DocumentStoreDTO } from '../Domain/DocumentStore.Entity'
import createDocumentStore from '../Application/UseCases/CreateDocumentStore'
import { getAllDocumentStores, getDocumentStoreById } from '../Application/UseCases/GetDocumentsStore'
import { deleteDocumentStore } from '../Application/UseCases/DeleteDocumentStore'
import { DocumentStore } from '../../../core/Database/Entities/DocumentStore'
import { updateDocumentStore } from '../Application/UseCases/UpdateDocumentStore'
import { findDocStoreAvailableConfigs } from '../Application/UseCases/FindDocStoreAvailableConfigs'

const createDocumentStoreService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.createDocumentStore - body not provided!`
            )
        }
        const body = req.body
        const docStore = DocumentStoreDTO.toEntity(body)
        const apiResponse = await createDocumentStore(docStore)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllDocumentStoresService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getAllDocumentStores()
        return res.json(DocumentStoreDTO.fromEntities(apiResponse))
    } catch (error) {
        next(error)
    }
}

const getDocumentsStoreByIdService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getDocumentStoreById(req.params.id)
        return res.json(DocumentStoreDTO.fromEntity(apiResponse))
    } catch (error) {
        next(error)
    }
}

const deleteDocumentStoreService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.deleteDocumentStore - storeId not provided!`
            )
        }
        const apiResponse = deleteDocumentStore(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateDocumentStoreService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.updateDocumentStore - storeId not provided!`
            )
        }
        if (typeof req.body === 'undefined') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.updateDocumentStore - body not provided!`
            )
        }
        const store = await getDocumentStoreById(req.params.id)
        if (!store) {
            throw new FreshbufferAiError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreController.updateDocumentStore - DocumentStore ${req.params.id} not found in the database`
            )
        }
        const body = req.body
        const updateDocStore = new DocumentStore()
        Object.assign(updateDocStore, body)
        const apiResponse = await updateDocumentStore(store, updateDocStore)
        return res.json(DocumentStoreDTO.fromEntity(apiResponse))
    } catch (error) {
        next(error)
    }
}

const getDocStoreConfigsService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.id === 'undefined' || req.params.id === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.getDocStoreConfigs - storeId not provided!`
            )
        }
        if (typeof req.params.loaderId === 'undefined' || req.params.loaderId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.getDocStoreConfigs - doc loader Id not provided!`
            )
        }
        const apiResponse = await findDocStoreAvailableConfigs(req.params.id, req.params.loaderId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createDocumentStoreService,
    getAllDocumentStoresService,
    getDocumentsStoreByIdService,
    deleteDocumentStoreService,
    updateDocumentStoreService,
    getDocStoreConfigsService
}
