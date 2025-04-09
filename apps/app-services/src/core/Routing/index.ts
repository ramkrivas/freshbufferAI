import express from 'express'
import { documentStoreRouter } from '../../modules/DocumentStore/Presentation/DocumentStoreRoutes'
import { nodesRouter } from '../../core/Nodes/Presentation/NodesRoutes'
import { chatFlowsRouter } from '../../modules/ChatFlows/Presentation/ChatFlowsRoutes'
import { nodeLoadMethodsRouter } from '../../core/Nodes/Presentation/NodeLoadMethodsRoutes'
import { credentialsRouter } from '../../modules/Credentials/Presentation/CredentialsRoutes'
import { internalPredictionsRouter } from '../../modules/InternalPredictions/Presentation/InternalPredictionsRoutes'
import { chatMessagesRouter } from '../../modules/ChatMessages/Presentation/ChatMessagesRoutes'
import { internalChatMessagesRouter } from '../../modules/ChatMessages/Presentation/InternalChatMessagesRoutes'
import { chatFlowStreamingRouter } from '../../modules/ChatFlows/Presentation/ChatFlowStreamingRoutes'
import { chatFlowUploadsRouter } from '../../modules/ChatFlows/Presentation/ChatFlowUploadsRoutes'

const router = express.Router()

router.use('/document-store', documentStoreRouter)
router.use('/nodes', nodesRouter)
router.use('/chatflows', chatFlowsRouter)
router.use('/node-load-method', nodeLoadMethodsRouter)
router.use('/credentials', credentialsRouter)
router.use('/internal-prediction', internalPredictionsRouter)
router.use('/chatmessage', chatMessagesRouter)
router.use('/internal-chatmessage', internalChatMessagesRouter)
router.use('/chatflows-streaming', chatFlowStreamingRouter)
router.use('/chatflows-uploads', chatFlowUploadsRouter)
export default router
