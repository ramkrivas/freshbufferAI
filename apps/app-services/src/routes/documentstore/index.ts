import express from 'express'
import documentStoreController from '../../modules/document-store/presentation/DocumentStoreController'
const router = express.Router()

/** Document Store Routes */
// Create document store
router.post('/store', documentStoreController.createDocumentStoreService)
// List all stores
router.get('/store', documentStoreController.getAllDocumentStoresService)

export default router
