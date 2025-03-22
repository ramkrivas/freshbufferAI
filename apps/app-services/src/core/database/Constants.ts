import { IDatabaseEntity } from '../../modules/DocumentStore'
import { DocumentStore } from './Entities/DocumentStore'
import { Credential } from './Entities/Credential'
import { ChatFlow } from './Entities/ChatFlow'
import { DocumentStoreFileChunk } from './Entities/DocumentStoreFileChunk'
import { ChatMessage } from './Entities/ChatMessage'

export const databaseEntities: IDatabaseEntity = {
    DocumentStore: DocumentStore,
    DocumentStoreFileChunk: DocumentStoreFileChunk,
    Credential: Credential,
    ChatFlow: ChatFlow,
    ChatMessage: ChatMessage
}
