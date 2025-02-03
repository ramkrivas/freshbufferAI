export type CommonType = string | number | boolean | undefined | null

export interface ICommonObject {
    [key: string]: any | CommonType | ICommonObject | CommonType[] | ICommonObject[]
}

export type IDatabaseEntity = {
    [key: string]: any
}

export interface IDocumentStore {
    id: string
    name: string
    description: string
    loaders: string // JSON string
    whereUsed: string // JSON string
    updatedDate: Date
    createdDate: Date
    status: DocumentStoreStatus
    vectorStoreConfig: string | null // JSON string
    embeddingConfig: string | null // JSON string
    recordManagerConfig: string | null // JSON string
}

export enum DocumentStoreStatus {
    EMPTY_SYNC = 'EMPTY',
    SYNC = 'SYNC',
    SYNCING = 'SYNCING',
    STALE = 'STALE',
    NEW = 'NEW',
    UPSERTING = 'UPSERTING',
    UPSERTED = 'UPSERTED'
}

export interface IDocumentStoreFileChunk {
    id: string
    chunkNo: number
    docId: string
    storeId: string
    pageContent: string
    metadata: string
}

export interface IDocumentStoreFileChunkPagedResponse {
    chunks: IDocumentStoreFileChunk[]
    count: number
    characters: number
    file?: IDocumentStoreLoader
    currentPage: number
    storeName: string
    description: string
    docId: string
}

export interface IDocumentStoreLoader {
    id?: string
    loaderId?: string
    loaderName?: string
    loaderConfig?: any // JSON string
    splitterId?: string
    splitterName?: string
    splitterConfig?: any // JSON string
    totalChunks?: number
    totalChars?: number
    status?: DocumentStoreStatus
    storeId?: string
    files?: IDocumentStoreLoaderFile[]
    source?: string
    credential?: string
}

export interface IDocumentStoreLoaderForPreview extends IDocumentStoreLoader {
    rehydrated?: boolean
    preview?: boolean
    previewChunkCount?: number
}

export interface IDocumentStoreUpsertData {
    docId: string
    metadata?: string | object
    replaceExisting?: boolean
    loader?: {
        name: string
        config: ICommonObject
    }
    splitter?: {
        name: string
        config: ICommonObject
    }
    vectorStore?: {
        name: string
        config: ICommonObject
    }
    embedding?: {
        name: string
        config: ICommonObject
    }
    recordManager?: {
        name: string
        config: ICommonObject
    }
}

export interface IDocumentStoreRefreshData {
    items: IDocumentStoreUpsertData[]
}

export interface IDocumentStoreLoaderFile {
    id: string
    name: string
    mimePrefix: string
    size: number
    status: DocumentStoreStatus
    uploaded: Date
}

export interface IDocumentStoreWhereUsed {
    id: string
    name: string
}
