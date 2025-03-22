import express from 'express'
import chatflowsController from './ChatFlowsController'
const router = express.Router()

router.post('/', chatflowsController.saveChatflowService)

router.get('/', chatflowsController.getAllChatflowsService)

export { router as chatFlowsRouter }
