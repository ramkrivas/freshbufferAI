import { StatusCodes } from 'http-status-codes'
import { cloneDeep } from 'lodash'
import { getErrorMessage } from '../../../Errors/Utils'
import { FreshbufferAiError } from '../../../Errors'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'
import { INodeOptionsValue, INodeData } from 'apps/core-plugins/dist/src'
import { databaseEntities } from '@app-services/core/Database/Constants'

// Get all component nodes
const getAllNodes = async () => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = []
        for (const nodeName in appServer.nodesPool.componentNodes) {
            const clonedNode = cloneDeep(appServer.nodesPool.componentNodes[nodeName])
            dbResponse.push(clonedNode)
        }
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: nodesService.getAllNodes - ${getErrorMessage(error)}`)
    }
}

// Get all component nodes for a specific category
const getAllNodesForCategory = async (category: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = []
        for (const nodeName in appServer.nodesPool.componentNodes) {
            const componentNode = appServer.nodesPool.componentNodes[nodeName]
            if (componentNode.category === category) {
                const clonedNode = cloneDeep(componentNode)
                dbResponse.push(clonedNode)
            }
        }
        return dbResponse
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: nodesService.getAllNodesForCategory - ${getErrorMessage(error)}`
        )
    }
}

// Get specific component node via name
const getNodeByName = async (nodeName: string) => {
    try {
        const appServer = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentNodes, nodeName)) {
            const dbResponse = appServer.nodesPool.componentNodes[nodeName]
            return dbResponse
        } else {
            throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Node ${nodeName} not found`)
        }
    } catch (error) {
        throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: nodesService.getAllNodes - ${getErrorMessage(error)}`)
    }
}

// Returns specific component node icon via name
const getSingleNodeIcon = async (nodeName: string) => {
    try {
        const appServer = getRunningExpressApp()
        if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentNodes, nodeName)) {
            const nodeInstance = appServer.nodesPool.componentNodes[nodeName]
            if (nodeInstance.icon === undefined) {
                throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Node ${nodeName} icon not found`)
            }

            if (nodeInstance.icon.endsWith('.svg') || nodeInstance.icon.endsWith('.png') || nodeInstance.icon.endsWith('.jpg')) {
                const filepath = nodeInstance.icon
                return filepath
            } else {
                throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Node ${nodeName} icon is missing icon`)
            }
        } else {
            throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Node ${nodeName} not found`)
        }
    } catch (error) {
        throw new FreshbufferAiError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: nodesService.getSingleNodeIcon - ${getErrorMessage(error)}`)
    }
}

const getSingleNodeAsyncOptions = async (nodeName: string, requestBody: any): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const nodeData: INodeData = requestBody
        if (Object.prototype.hasOwnProperty.call(appServer.nodesPool.componentNodes, nodeName)) {
            try {
                const nodeInstance = appServer.nodesPool.componentNodes[nodeName]
                const methodName = nodeData.loadMethod || ''

                const dbResponse: INodeOptionsValue[] = await nodeInstance.loadMethods![methodName]!.call(nodeInstance, nodeData, {
                    appDataSource: appServer.AppDataSource,
                    databaseEntities: databaseEntities
                })

                return dbResponse
            } catch (error) {
                return []
            }
        } else {
            throw new FreshbufferAiError(StatusCodes.NOT_FOUND, `Node ${nodeName} not found`)
        }
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: nodesService.getSingleNodeAsyncOptions - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllNodes,
    getNodeByName,
    getSingleNodeIcon,
    getAllNodesForCategory,
    getSingleNodeAsyncOptions
}
