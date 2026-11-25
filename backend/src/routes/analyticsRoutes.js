import { Router } from 'express'
import * as analyticsController from '../controllers/analyticsController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const analyticsRoutes = Router()

analyticsRoutes.use(authenticate, requireRole('curator'))
analyticsRoutes.get('/overview', analyticsController.overview)

export default analyticsRoutes
