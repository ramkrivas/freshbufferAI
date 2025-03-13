import express from 'express'
import credentialsController from './CredentialsController'
const router = express.Router()

router.get('/', credentialsController.getAllCredentialsService)
// CREATE
router.post('/', credentialsController.createCredentialService)

export { router as credentialsRouter }
