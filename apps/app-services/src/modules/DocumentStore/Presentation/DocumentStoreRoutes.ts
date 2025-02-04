import express from 'express'
import documentStoreController from './DocumentStoreController'
const router = express.Router()

/** Document Store Routes */
// Create document store
router.post('/store', documentStoreController.createDocumentStoreService)
// List all stores
router.get('/store', documentStoreController.getAllDocumentStoresService)

export { router as documentStoreRouter }
