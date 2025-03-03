import { StatusCodes } from 'http-status-codes'
import { FreshbufferAiError } from '../../../../../core/Errors'
import nodesService from '../../../../../core/Nodes/Application/UseCases/index'
import { getErrorMessage } from '../../../../../core/Errors/Utils'

// Get all component nodes - Vector Stores
export const getVectorStoreProviders = async () => {
    try {
        const dbResponse = await nodesService.getAllNodesForCategory('Vector Stores')
        return dbResponse.filter(
            (node) => !node.tags?.includes('LlamaIndex') && node.name !== 'documentStoreVS' && node.name !== 'memoryVectorStore'
        )
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getVectorStoreProviders - ${getErrorMessage(error)}`
        )
    }
}
