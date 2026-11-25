import { Router } from 'express'
import * as workerController from '../controllers/workerController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const workerRoutes = Router()

workerRoutes.use(authenticate, requireRole('curator'))
workerRoutes.get('/', workerController.list)
workerRoutes.post('/', workerController.create)

export default workerRoutes
