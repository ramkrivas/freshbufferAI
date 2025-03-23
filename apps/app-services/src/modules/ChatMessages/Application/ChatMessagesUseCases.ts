import { FreshbufferAiError, getErrorMessage } from '@app-services/core/Errors'
import { ChatMessageRatingType, ChatType, IChatMessage } from '@app-services/core/Interfaces'
import logger from '@app-services/core/Logger'
import { StatusCodes } from 'http-status-codes'
import { DeleteResult, FindOptionsWhere } from 'typeorm'
import { ChatMessage } from '../../../core/Database/Entities/ChatMessage'
import { ChatMessageFeedback } from '../../../core/Database/Entities/ChatMessageFeedback'
import { removeFilesFromStorage } from '../../../utils/'
import { utilGetChatMessage } from '../../../utils/getChatMessage'
import { getRunningExpressApp } from '../../../utils/Server/getRunningExpressApp'
import { utilAddChatMessage } from '../../InternalPredictions/Application/addChatMesage'

export const createChatMessage = async (chatMessage: Partial<IChatMessage>) => {
    try {
        const dbResponse = await utilAddChatMessage(chatMessage)
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.createChatMessage - ${getErrorMessage(error)}`
        )
    }
}

// Get all chatmessages from chatflowid
export const getAllChatMessages = async (
    chatflowId: string,
    chatTypes: ChatType[] | undefined,
    sortOrder: string = 'ASC',
    chatId?: string,
    memoryType?: string,
    sessionId?: string,
    startDate?: string,
    endDate?: string,
    messageId?: string,
    feedback?: boolean,
    feedbackTypes?: ChatMessageRatingType[]
): Promise<ChatMessage[]> => {
    try {
        const dbResponse = await utilGetChatMessage({
            chatflowid: chatflowId,
            chatTypes,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedback,
            feedbackTypes
        })
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.getAllChatMessages - ${getErrorMessage(error)}`
        )
    }
}
// Get internal chatmessages from chatflowid
export const getAllInternalChatMessages = async (
    chatflowId: string,
    chatTypes: ChatType[] | undefined,
    sortOrder: string = 'ASC',
    chatId?: string,
    memoryType?: string,
    sessionId?: string,
    startDate?: string,
    endDate?: string,
    messageId?: string,
    feedback?: boolean,
    feedbackTypes?: ChatMessageRatingType[]
): Promise<ChatMessage[]> => {
    try {
        const dbResponse = await utilGetChatMessage({
            chatflowid: chatflowId,
            chatTypes,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedback,
            feedbackTypes
        })
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.getAllInternalChatMessages - ${getErrorMessage(error)}`
        )
    }
}

export const removeAllChatMessages = async (
    chatId: string,
    chatflowid: string,
    deleteOptions: FindOptionsWhere<ChatMessage>
): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()

        // Remove all related feedback records
        const feedbackDeleteOptions: FindOptionsWhere<ChatMessageFeedback> = { chatId }
        await appServer.AppDataSource.getRepository(ChatMessageFeedback).delete(feedbackDeleteOptions)

        // Delete all uploads corresponding to this chatflow/chatId
        if (chatId) {
            try {
                await removeFilesFromStorage(chatflowid, chatId)
            } catch (e) {
                logger.error(`[server]: Error deleting file storage for chatflow ${chatflowid}, chatId ${chatId}: ${e}`)
            }
        }
        const dbResponse = await appServer.AppDataSource.getRepository(ChatMessage).delete(deleteOptions)
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.removeAllChatMessages - ${getErrorMessage(error)}`
        )
    }
}

export const removeChatMessagesByMessageIds = async (
    chatflowid: string,
    chatIdMap: Map<string, ChatMessage[]>,
    messageIds: string[]
): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()

        for (const [composite_key] of chatIdMap) {
            const [chatId] = composite_key.split('_')

            // Remove all related feedback records
            const feedbackDeleteOptions: FindOptionsWhere<ChatMessageFeedback> = { chatId }
            await appServer.AppDataSource.getRepository(ChatMessageFeedback).delete(feedbackDeleteOptions)

            // Delete all uploads corresponding to this chatflow/chatId
            await removeFilesFromStorage(chatflowid, chatId)
        }

        const dbResponse = await appServer.AppDataSource.getRepository(ChatMessage).delete(messageIds)
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.removeAllChatMessages - ${getErrorMessage(error)}`
        )
    }
}

export const abortChatMessage = async (chatId: string, chatflowid: string) => {
    try {
        const appServer = getRunningExpressApp()

        const endingNodeData = appServer.chatflowPool.activeChatflows[`${chatflowid}_${chatId}`]?.endingNodeData as any

        if (endingNodeData && endingNodeData.signal) {
            try {
                endingNodeData.signal.abort()
                await appServer.chatflowPool.remove(`${chatflowid}_${chatId}`)
            } catch (e) {
                logger.error(`[server]: Error aborting chat message for ${chatflowid}, chatId ${chatId}: ${e}`)
            }
        }
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.abortChatMessage - ${getErrorMessage(error)}`
        )
    }
}
