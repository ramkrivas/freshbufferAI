import express from 'express'
import chatflowsController from './ChatFlowsController'
const router = express.Router()

router.get('/', chatflowsController.getAllChatflowsService)

export { router as chatFlowsRouter }
