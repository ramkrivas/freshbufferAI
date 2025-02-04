import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFreshbufferAiError } from '../../../core/Errors/internalFreshbufferAiError'
import { DocumentStoreDTO } from '../Domain/DocumentStore.Entity'
import createDocumentStore from '../Application/UseCases/CreateDocumentStore'
import { getAllDocumentStores } from '../Application/UseCases/GetDocumentsStore'

const createDocumentStoreService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFreshbufferAiError(
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

export default { createDocumentStoreService, getAllDocumentStoresService }
