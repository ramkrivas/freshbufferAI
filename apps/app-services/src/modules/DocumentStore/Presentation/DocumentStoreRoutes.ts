import express from 'express'
import documentStoreController from './DocumentStoreController'
import loaderController from './LoadersController'
import vectorStoreController from './VectorStoreController'
import componentsController from './ComponentsController'
const router = express.Router()

/** Document Store Routes */
// Create document store
router.post('/store', documentStoreController.createDocumentStoreService)
// List all stores
router.get('/store', documentStoreController.getAllDocumentStoresService)
// Get store by id
router.get('/store/:id', documentStoreController.getAllDocumentStoresService)
// Update documentStore
router.put('/store/:id', documentStoreController.updateDocumentStoreService)
// Delete store by id
router.delete('/store/:id', documentStoreController.deleteDocumentStoreService)
// Get document store configs
router.get('/store-configs/:id/:loaderId', documentStoreController.getDocStoreConfigsService)

// Get all loaders
router.get('/components/loaders', loaderController.getDocumentLoadersService)

// delete loader from document store
router.delete('/loader/:id/:loaderId', loaderController.deleteLoaderFromDocumentStoreService)
// chunking preview
router.post('/loader/preview', loaderController.previewFileChunks)
// saving process
router.post('/loader/save', loaderController.saveProcessingLoaderService)
// chunking process
router.post('/loader/process/:loaderId', loaderController.processLoaderService)

// Get all file chunks from the store
router.get('/chunks/:storeId/:fileId/:pageNo', loaderController.getDocumentStoreFileChunksService)
// edit specific file chunk from the store
router.put('/chunks/:storeId/:loaderId/:chunkId', loaderController.editDocumentStoreFileChunkService)
// delete specific file chunk from the store
router.delete('/chunks/:storeId/:loaderId/:chunkId', loaderController.deleteDocumentStoreFileChunkService)

// add chunks to the selected vector store
router.post('/vectorstore/insert', vectorStoreController.insertIntoVectorStoreService)
// save the selected vector store
router.post('/vectorstore/save', vectorStoreController.saveVectorStoreConfigService)
// delete data from the selected vector store
router.delete('/vectorstore/:storeId', vectorStoreController.deleteVectorStoreFromStoreService)
// query the vector store
router.post('/vectorstore/query', vectorStoreController.queryVectorStoreService)

// Get all embedding providers
router.get('/components/embeddings', componentsController.getEmbeddingProvidersService)
// Get all vector store providers
router.get('/components/vectorstore', componentsController.getVectorStoreProvidersService)
// Get all Record Manager providers
router.get('/components/recordmanager', componentsController.getRecordManagerProvidersService)

export { router as documentStoreRouter }
