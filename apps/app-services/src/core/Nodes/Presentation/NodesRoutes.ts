import express from 'express'
import nodesController from './NodesController'
const router = express.Router()

// READ
router.get('/', nodesController.getAllNodes)
router.get(['/', '/:name'], nodesController.getNodeByName)
router.get('/category/:name', nodesController.getNodesByCategory)

export { router as nodesRouter }
