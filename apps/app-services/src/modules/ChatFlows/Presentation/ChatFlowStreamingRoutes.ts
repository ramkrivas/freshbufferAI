import express from 'express'
import chatflowsController from './ChatFlowsController'

const router = express.Router()

// READ
router.get(['/', '/:id'], chatflowsController.checkIfChatflowIsValidForStreamingService)

export { router as chatFlowStreamingRouter }
