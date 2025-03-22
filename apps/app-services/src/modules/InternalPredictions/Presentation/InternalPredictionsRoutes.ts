import express from 'express'
import internalPredictionsController from './CreateInternalPrediction'
const router = express.Router()

// CREATE
router.post(['/', '/:id'], internalPredictionsController.createInternalPrediction)

export { router as internalPredictionsRouter }
