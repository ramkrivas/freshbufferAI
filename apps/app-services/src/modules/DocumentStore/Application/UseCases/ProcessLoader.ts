import { addSingleFileToStorage, IDocument, removeSpecificFileFromStorage } from 'core-plugins'
import { StatusCodes } from 'http-status-codes'
import { v4 as uuidv4 } from 'uuid'
import { DocumentStore } from '../../../../core/Database/Entities/DocumentStore'
import { DocumentStoreFileChunk } from '../../../../core/Database/Entities/DocumentStoreFileChunk'
import { FreshbufferAiError } from '../../../../core/Errors'
import { getErrorMessage } from '../../../../core/Errors/Utils'
import { getRunningExpressApp } from '../../../../utils/Server/getRunningExpressApp'
import { DocumentStoreStatus, IDocumentStoreLoader, IDocumentStoreLoaderFile, IDocumentStoreLoaderForPreview } from '../../Domain'
import { getDocumentStoreFileChunks } from './GetDocumentStoreFileChunks'
import { _normalizeFilePaths, DOCUMENT_STORE_BASE_FOLDER, previewChunks } from './PostLoadersPreview'

export const processLoader = async (data: IDocumentStoreLoaderForPreview, docLoaderId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const entity = await appServer.AppDataSource.getRepository(DocumentStore).findOneBy({
            id: data.storeId
        })
        if (!entity) {
            throw new FreshbufferAiError(
                StatusCodes.NOT_FOUND,
                `Error: documentStoreServices.processLoader - Document store ${data.storeId} not found`
            )
        }
        // this method will run async, will have to be moved to a worker thread
        await _saveChunksToStorage(data, entity, docLoaderId)
        return getDocumentStoreFileChunks(data.storeId as string, docLoaderId)
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices.processLoader - ${getErrorMessage(error)}`
        )
    }
}

const _saveChunksToStorage = async (data: IDocumentStoreLoaderForPreview, entity: DocumentStore, newLoaderId: string) => {
    const re = new RegExp('^data.*;base64', 'i')

    try {
        const appServer = getRunningExpressApp()
        //step 1: restore the full paths, if any
        await _normalizeFilePaths(data, entity)

        //step 2: split the file into chunks
        const response = await previewChunks(data)

        //step 3: remove all files associated with the loader
        const existingLoaders = JSON.parse(entity.loaders)
        const loader = existingLoaders.find((ldr: IDocumentStoreLoader) => ldr.id === newLoaderId)
        if (data.id) {
            const index = existingLoaders.indexOf(loader)
            if (index > -1) {
                existingLoaders.splice(index, 1)
                if (!data.rehydrated) {
                    if (loader.files) {
                        loader.files.map(async (file: IDocumentStoreLoaderFile) => {
                            try {
                                await removeSpecificFileFromStorage(DOCUMENT_STORE_BASE_FOLDER, entity.id, file.name)
                            } catch (error) {
                                console.error(error)
                            }
                        })
                    }
                }
            }
        }

        //step 4: save new file to storage
        let filesWithMetadata = []
        const keys = Object.getOwnPropertyNames(data.loaderConfig)
        for (let i = 0; i < keys.length; i++) {
            const input = data.loaderConfig[keys[i]]
            if (!input) {
                continue
            }
            if (typeof input !== 'string') {
                continue
            }
            if (input.startsWith('[') && input.endsWith(']')) {
                const files = JSON.parse(input)
                const fileNames: string[] = []
                for (let j = 0; j < files.length; j++) {
                    const file = files[j]
                    if (re.test(file)) {
                        const fileMetadata = await _saveFileToStorage(file, entity)
                        fileNames.push(fileMetadata.name)
                        filesWithMetadata.push(fileMetadata)
                    }
                }
                data.loaderConfig[keys[i]] = 'FILE-STORAGE::' + JSON.stringify(fileNames)
            } else if (re.test(input)) {
                const fileNames: string[] = []
                const fileMetadata = await _saveFileToStorage(input, entity)
                fileNames.push(fileMetadata.name)
                filesWithMetadata.push(fileMetadata)
                data.loaderConfig[keys[i]] = 'FILE-STORAGE::' + JSON.stringify(fileNames)
                break
            }
        }

        //step 5: update with the new files and loaderConfig
        if (filesWithMetadata.length > 0) {
            loader.loaderConfig = data.loaderConfig
            loader.files = filesWithMetadata
        }

        //step 6: update the loaders with the new loaderConfig
        if (data.id) {
            existingLoaders.push(loader)
        }

        //step 7: remove all previous chunks
        await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).delete({ docId: newLoaderId })
        if (response.chunks) {
            //step 8: now save the new chunks
            const totalChars = response.chunks.reduce((acc, chunk) => {
                if (chunk.pageContent) {
                    return acc + chunk.pageContent.length
                }
                return acc
            }, 0)
            response.chunks.map(async (chunk: IDocument, index: number) => {
                const docChunk: DocumentStoreFileChunk = {
                    docId: newLoaderId,
                    storeId: data.storeId || '',
                    id: uuidv4(),
                    chunkNo: index + 1,
                    pageContent: chunk.pageContent,
                    metadata: JSON.stringify(chunk.metadata)
                }
                const dChunk = appServer.AppDataSource.getRepository(DocumentStoreFileChunk).create(docChunk)
                await appServer.AppDataSource.getRepository(DocumentStoreFileChunk).save(dChunk)
            })
            // update the loader with the new metrics
            loader.totalChunks = response.totalChunks
            loader.totalChars = totalChars
        }
        loader.status = 'SYNC'
        // have a flag and iterate over the loaders and update the entity status to SYNC
        const allSynced = existingLoaders.every((ldr: IDocumentStoreLoader) => ldr.status === 'SYNC')
        entity.status = allSynced ? DocumentStoreStatus.SYNC : DocumentStoreStatus.STALE
        entity.loaders = JSON.stringify(existingLoaders)

        //step 9: update the entity in the database
        await appServer.AppDataSource.getRepository(DocumentStore).save(entity)

        return
    } catch (error) {
        throw new FreshbufferAiError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: documentStoreServices._saveChunksToStorage - ${getErrorMessage(error)}`
        )
    }
}

const _saveFileToStorage = async (fileBase64: string, entity: DocumentStore) => {
    const splitDataURI = fileBase64.split(',')
    const filename = splitDataURI.pop()?.split(':')[1] ?? ''
    const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
    const mimePrefix = splitDataURI.pop()
    let mime = ''
    if (mimePrefix) {
        mime = mimePrefix.split(';')[0].split(':')[1]
    }
    await addSingleFileToStorage(mime, bf, filename, DOCUMENT_STORE_BASE_FOLDER, entity.id)
    return {
        id: uuidv4(),
        name: filename,
        mimePrefix: mime,
        size: bf.length,
        status: DocumentStoreStatus.NEW,
        uploaded: new Date()
    }
}
