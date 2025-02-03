import express from 'express'
import documentStoreRouter from './documentstore'

const router = express.Router()

router.use('/document-store', documentStoreRouter)

export default router
