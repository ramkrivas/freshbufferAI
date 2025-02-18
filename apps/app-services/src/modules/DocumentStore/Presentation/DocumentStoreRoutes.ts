import express from 'express'
import documentStoreController from './DocumentStoreController'
import loaderController from './LoadersController'
const router = express.Router()

/** Document Store Routes */
// Create document store
router.post('/store', documentStoreController.createDocumentStoreService)
// List all stores
router.get('/store', documentStoreController.getAllDocumentStoresService)
// Get store by id
router.get('/store/:id', documentStoreController.getAllDocumentStoresService)
// Delete store by id
router.delete('/store/:id', documentStoreController.deleteDocumentStoreService)

// Update documentStore
router.put('/store/:id', documentStoreController.updateDocumentStoreService)

// Get all loaders
router.get('/components/loaders', loaderController.getDocumentLoadersService)

// chunking preview
router.post('/loader/preview', loaderController.previewFileChunks)
export { router as documentStoreRouter }
