import { ICommonObject } from 'core-plugins'
import { INodeData } from '../core/Interfaces/Interfaces'
import { getFileName } from './FileSytem/getFileName'
/**
 * Save upsert flowData
 * @param {INodeData} nodeData
 * @param {Record<string, any>} upsertHistory
 */
export const saveUpsertFlowData = (nodeData: INodeData, upsertHistory: Record<string, any>): ICommonObject[] => {
    const existingUpsertFlowData = upsertHistory['flowData'] ?? []
    const paramValues: ICommonObject[] = []

    for (const input in nodeData.inputs) {
        const inputParam = nodeData.inputParams.find((inp) => inp.name === input)
        if (!inputParam) continue

        let paramValue: ICommonObject = {}

        if (!nodeData.inputs[input]) {
            continue
        }
        if (
            typeof nodeData.inputs[input] === 'string' &&
            nodeData.inputs[input].startsWith('{{') &&
            nodeData.inputs[input].endsWith('}}')
        ) {
            continue
        }
        // Get file name instead of the base64 string
        if (nodeData.category === 'Document Loaders' && nodeData.inputParams.find((inp) => inp.name === input)?.type === 'file') {
            paramValue = {
                label: inputParam?.label,
                name: inputParam?.name,
                type: inputParam?.type,
                value: getFileName(nodeData.inputs[input])
            }
            paramValues.push(paramValue)
            continue
        }

        paramValue = {
            label: inputParam?.label,
            name: inputParam?.name,
            type: inputParam?.type,
            value: nodeData.inputs[input]
        }
        paramValues.push(paramValue)
    }

    const newFlowData = {
        label: nodeData.label,
        name: nodeData.name,
        category: nodeData.category,
        id: nodeData.id,
        paramValues
    }
    existingUpsertFlowData.push(newFlowData)
    return existingUpsertFlowData
}
