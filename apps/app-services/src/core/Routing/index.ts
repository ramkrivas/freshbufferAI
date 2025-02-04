import express from 'express'
import { documentStoreRouter } from '../../modules/DocumentStore'

const router = express.Router()

router.use('/document-store', documentStoreRouter)

export default router
