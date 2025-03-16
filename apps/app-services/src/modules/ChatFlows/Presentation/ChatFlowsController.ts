import { NextFunction, Request, Response } from 'express'
import { getAllChatflows, getChatflowById } from '../Application/UseCases/GetAllChatflows'
import { ChatflowType } from '../Domain/Interface'
import { FreshbufferAiError } from '@app-services/core/Errors'
import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '@app-services/core/Database/Entities/ChatFlow'
import { saveChatflow } from '../Application/UseCases/SaveChatflow'

const getAllChatflowsService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await getAllChatflows(req.query?.type as ChatflowType)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getChatflowByIdService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new FreshbufferAiError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.getChatflowById - id not provided!`)
        }
        const apiResponse = await getChatflowById(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}
const saveChatflowService = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new FreshbufferAiError(StatusCodes.PRECONDITION_FAILED, `Error: chatflowsRouter.saveChatflow - body not provided!`)
        }
        const body = req.body
        const newChatFlow = new ChatFlow()
        Object.assign(newChatFlow, body)
        const apiResponse = await saveChatflow(newChatFlow)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllChatflowsService,
    getChatflowByIdService,
    saveChatflowService
}
