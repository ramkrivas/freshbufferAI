import { NextFunction, Request, Response } from 'express'
import { DocumentStoreDTO } from '../Domain/DocumentStore.Entity'
import { insertIntoVectorStore } from '../Application/UseCases/Vectorstore/InsertIntoVectorStore'
import { saveVectorStoreConfig } from '../Application/UseCases/Vectorstore/SaveVectorStoreConfig'
import { deleteVectorStoreFromStore } from '../Application/UseCases/Vectorstore/DeleteVectorStoreFromStore'
import { FreshbufferAiError } from '../../../core/Errors'
import { StatusCodes } from 'http-status-codes'
import { queryVectorStore } from '../Application/UseCases/Vectorstore/QueryVectorStore'

const insertIntoVectorStoreService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error('Error: documentStoreController.insertIntoVectorStore - body not provided!')
        }
        const body = req.body
        const apiResponse = await insertIntoVectorStore(body)
        return res.json(DocumentStoreDTO.fromEntity(apiResponse))
    } catch (error) {
        next(error)
    }
}

const saveVectorStoreConfigService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error('Error: documentStoreController.saveVectorStoreConfig - body not provided!')
        }
        const body = req.body
        const apiResponse = await saveVectorStoreConfig(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteVectorStoreFromStoreService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params.storeId === 'undefined' || req.params.storeId === '') {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: documentStoreController.deleteVectorStoreFromStore - storeId not provided!`
            )
        }
        const apiResponse = await deleteVectorStoreFromStore(req.params.storeId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const queryVectorStoreService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new Error('Error: documentStoreController.queryVectorStore - body not provided!')
        }
        const body = req.body
        const apiResponse = await queryVectorStore(body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    insertIntoVectorStoreService,
    saveVectorStoreConfigService,
    deleteVectorStoreFromStoreService,
    queryVectorStoreService
}
