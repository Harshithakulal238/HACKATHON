import { Router } from 'express'
import {
  getCurrentMuseum,
  updateCurrentMuseum,
} from '../controllers/museumController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const museumRoutes = Router()

museumRoutes.use(authenticate, requireRole('curator'))
museumRoutes.get('/me', getCurrentMuseum)
museumRoutes.patch('/me', updateCurrentMuseum)

export default museumRoutes
