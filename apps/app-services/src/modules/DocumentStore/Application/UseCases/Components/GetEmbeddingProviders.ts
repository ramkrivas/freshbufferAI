import { StatusCodes } from 'http-status-codes'
import { FreshbufferAiError } from '../../../../../core/Errors'
import nodesService from '../../../../../core/Nodes/Application/UseCases/index'
import { getErrorMessage } from '../../../../../core/Errors/Utils'

// Get all component nodes - Embeddings
export const getEmbeddingProviders = async () => {
    try {
        const dbResponse = await nodesService.getAllNodesForCategory('Embeddings')
        return dbResponse.filter((node) => !node.tags?.includes('LlamaIndex'))
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.getEmbeddingProviders - ${getErrorMessage(error)}`
        )
    }
}
