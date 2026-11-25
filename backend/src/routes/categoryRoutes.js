import { Router } from 'express'
import * as categoryController from '../controllers/categoryController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'

const categoryRoutes = Router()

categoryRoutes.use(authenticate, requireRole('curator'))
categoryRoutes.get('/', categoryController.list)
categoryRoutes.post('/', categoryController.create)
categoryRoutes.get('/:id', categoryController.getById)
categoryRoutes.patch('/:id', categoryController.update)
categoryRoutes.delete('/:id', categoryController.remove)

export default categoryRoutes
