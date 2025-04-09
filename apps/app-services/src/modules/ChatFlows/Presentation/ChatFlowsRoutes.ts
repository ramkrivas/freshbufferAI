import express from 'express'
import chatflowsController from './ChatFlowsController'
const router = express.Router()

router.post('/', chatflowsController.saveChatflowService)

router.get('/', chatflowsController.getAllChatflowsService)
router.get(['/', '/:id'], chatflowsController.getChatflowByIdService)

export { router as chatFlowsRouter }
