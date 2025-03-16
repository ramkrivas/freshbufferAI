import { NextFunction, Request, Response } from 'express'
import { getAllCredentials } from '../Application/UseCases/GetAllCredentials'
import { FreshbufferAiError } from '@app-services/core/Errors'
import { createCredential } from '../Application/UseCases/CreateCredential'
import { StatusCodes } from 'http-status-codes'

const getAllCredentialsService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getAllCredentials(req.query.credentialName)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}
const createCredentialService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new FreshbufferAiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.createCredential - body not provided!`
            )
        }
        const apiResponse = await createCredential(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllCredentialsService,
    createCredentialService
}
