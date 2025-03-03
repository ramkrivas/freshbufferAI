import { INodeData as INodeDataFromComponent, INodeParams } from 'core-plugins'
export interface IOverrideConfig {
    node: string
    nodeId: string
    label: string
    name: string
    type: string
}

export interface INodeData extends INodeDataFromComponent {
    inputAnchors: INodeParams[]
    inputParams: INodeParams[]
    outputAnchors: INodeParams[]
}
export interface IUpsertHistory {
    id: string
    chatflowid: string
    result: string
    flowData: string
    date: Date
}
