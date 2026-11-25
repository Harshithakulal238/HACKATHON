import { Router } from 'express'
import * as galleryController from '../controllers/galleryController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const galleryRoutes = Router()

galleryRoutes.use(authenticate, requireRole('curator'))
galleryRoutes.get('/', galleryController.list)
galleryRoutes.post('/', galleryController.create)
galleryRoutes.get('/:id', galleryController.getById)
galleryRoutes.patch('/:id', galleryController.update)
galleryRoutes.delete('/:id', galleryController.remove)

export default galleryRoutes
