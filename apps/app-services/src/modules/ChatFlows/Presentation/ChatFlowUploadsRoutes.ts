import express from 'express'
import chatflowsController from './ChatFlowsController'

const router = express.Router()

// READ
router.get(['/', '/:id'], chatflowsController.checkIfChatflowIsValidForUploadsService)

export { router as chatFlowUploadsRouter }
