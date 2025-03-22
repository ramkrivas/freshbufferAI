import { ChatMessage } from '../../../core/Database/Entities'
import { IChatMessage } from '@app-services/core/Interfaces'
import { getRunningExpressApp } from '../../../utils/Server/getRunningExpressApp'

/**
 * Method that add chat messages.
 * @param {Partial<IChatMessage>} chatMessage
 */
export const utilAddChatMessage = async (chatMessage: Partial<IChatMessage>): Promise<ChatMessage> => {
    const appServer = getRunningExpressApp()
    const newChatMessage = new ChatMessage()
    Object.assign(newChatMessage, chatMessage)
    if (!newChatMessage.createdDate) {
        newChatMessage.createdDate = new Date()
    }
    const chatmessage = await appServer.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
    const dbResponse = await appServer.AppDataSource.getRepository(ChatMessage).save(chatmessage)
    return dbResponse
}
