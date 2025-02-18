import { NextFunction, Request, Response } from 'express'
import { getDocumentLoaders } from '../Application/UseCases/GetLoaders'
import { FreshbufferAiError } from '../../../core/Errors'
import { StatusCodes } from 'http-status-codes'
import { previewChunks } from '../Application/UseCases/PostLoadersPreview'

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

export default { getDocumentLoadersService, previewFileChunks }
