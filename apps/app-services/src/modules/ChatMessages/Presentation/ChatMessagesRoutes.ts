import express from 'express'
import chatMessageController from './ChatMessagesController'
const router = express.Router()

// CREATE
router.post(['/', '/:id'], chatMessageController.createChatMessageService)

// READ
router.get(['/', '/:id'], chatMessageController.getAllChatMessagesService)

// UPDATE
router.put(['/abort/', '/abort/:chatflowid/:chatid'], chatMessageController.abortChatMessageService)

// DELETE
router.delete(['/', '/:id'], chatMessageController.removeAllChatMessagesService)

export { router as chatMessagesRouter }
