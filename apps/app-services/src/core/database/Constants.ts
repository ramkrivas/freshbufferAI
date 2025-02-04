import { IDatabaseEntity } from '../../modules/DocumentStore'
import { DocumentStore } from './Entities/DocumentStore'
import { DocumentStoreFileChunk } from './Entities/DocumentStoreFileChunk'

export const databaseEntities: IDatabaseEntity = {
    DocumentStore: DocumentStore,
    DocumentStoreFileChunk: DocumentStoreFileChunk
}
