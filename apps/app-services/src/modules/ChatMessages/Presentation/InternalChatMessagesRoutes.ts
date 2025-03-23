import express from 'express'
import chatMessageController from './ChatMessagesController'
const router = express.Router()

router.get(['/', '/:id'], chatMessageController.getAllInternalChatMessagesService)

export { router as internalChatMessagesRouter }
