import { FreshbufferAiError, getErrorMessage } from '@app-services/core/Errors'
import { IReactFlowObject } from '@app-services/core/Interfaces'
import { updateDocumentStoreUsage } from '../../../DocumentStore/Application/UseCases/UpdateDocumentStore'
// import { updateDocumentStoreUsage } from '@app-services/modules/DocumentStore/Application/UseCases/UpdateDocumentStore'
import { containsBase64File } from '@app-services/utils/FileSytem/containsBase64File'
import { updateFlowDataWithFilePaths } from '@app-services/utils/FileSytem/updateFlowDataWithFilePaths'
import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../../../core/Database/Entities/ChatFlow'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'

export const saveChatflow = async (newChatFlow: ChatFlow): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        let dbResponse: ChatFlow
        if (containsBase64File(newChatFlow)) {
            // we need a 2-step process, as we need to save the chatflow first and then update the file paths
            // this is because we need the chatflow id to create the file paths

            // step 1 - save with empty flowData
            const incomingFlowData = newChatFlow.flowData
            newChatFlow.flowData = JSON.stringify({})
            const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            const step1Results = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)

            // step 2 - convert base64 to file paths and update the chatflow
            step1Results.flowData = await updateFlowDataWithFilePaths(step1Results.id, incomingFlowData)
            await _checkAndUpdateDocumentStoreUsage(step1Results)
            dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(step1Results)
        } else {
            const chatflow = appServer.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            dbResponse = await appServer.AppDataSource.getRepository(ChatFlow).save(chatflow)
        }
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: chatflowsService.saveChatflow - ${getErrorMessage(error)}`)
    }
}

const _checkAndUpdateDocumentStoreUsage = async (chatflow: ChatFlow) => {
    const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
    const nodes = parsedFlowData.nodes
    // from the nodes array find if there is a node with name == documentStore)
    const node = nodes.length > 0 && nodes.find((node) => node.data.name === 'documentStore')
    if (!node || !node.data || !node.data.inputs || node.data.inputs['selectedStore'] === undefined) {
        await updateDocumentStoreUsage(chatflow.id, undefined)
    } else {
        await updateDocumentStoreUsage(chatflow.id, node.data.inputs['selectedStore'])
    }
}
