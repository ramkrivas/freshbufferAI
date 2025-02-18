import express from 'express'
import { documentStoreRouter } from '../../modules/DocumentStore'
import { nodesRouter } from '../../core/Nodes/Presentation/NodesRoutes'
const router = express.Router()

router.use('/document-store', documentStoreRouter)
router.use('/nodes', nodesRouter)
export default router
