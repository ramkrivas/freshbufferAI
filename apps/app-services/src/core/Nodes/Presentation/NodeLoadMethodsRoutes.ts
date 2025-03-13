import express from 'express'
import nodesRouter from './NodesController'
const router = express.Router()

router.post(['/', '/:name'], nodesRouter.getSingleNodeAsyncOptions)

export { router as nodeLoadMethodsRouter }
