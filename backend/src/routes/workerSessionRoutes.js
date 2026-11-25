import { Router } from 'express'
import * as workerSessionController from '../controllers/workerSessionController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const workerSessionRoutes = Router()

workerSessionRoutes.use(authenticate, requireRole('worker'))
workerSessionRoutes.get('/categories', workerSessionController.categories)
workerSessionRoutes.get('/', workerSessionController.list)
workerSessionRoutes.post('/', workerSessionController.create)

export default workerSessionRoutes
