import express from 'express'
import { documentStoreRouter } from '../../modules/DocumentStore/Presentation/DocumentStoreRoutes'
import { nodesRouter } from '../../core/Nodes/Presentation/NodesRoutes'
import { chatFlowsRouter } from '../../modules/ChatFlows/Presentation/ChatFlowsRoutes'
import { nodeLoadMethodsRouter } from '../../core/Nodes/Presentation/NodeLoadMethodsRoutes'
import { credentialsRouter } from '../../modules/Credentials/Presentation/CredentialsRoutes'
import { internalPredictionsRouter } from '../../modules/InternalPredictions/Presentation/InternalPredictionsRoutes'
const router = express.Router()

router.use('/document-store', documentStoreRouter)
router.use('/nodes', nodesRouter)
router.use('/chatflows', chatFlowsRouter)
router.use('/node-load-method', nodeLoadMethodsRouter)
router.use('/credentials', credentialsRouter)
router.use('/internal-prediction', internalPredictionsRouter)
export default router
