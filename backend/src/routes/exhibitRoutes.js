import { Router } from 'express'
import * as exhibitController from '../controllers/exhibitController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'
import {
  exhibitMediaUpload,
  handleUploadError,
} from '../middleware/uploadMiddleware.js'

const exhibitRoutes = Router()

exhibitRoutes.use(authenticate, requireRole('curator'))
exhibitRoutes.get('/', exhibitController.list)
exhibitRoutes.post('/', exhibitController.create)
exhibitRoutes.get('/:id', exhibitController.getById)
exhibitRoutes.post(
  '/:id/media',
  exhibitMediaUpload,
  handleUploadError,
  exhibitController.updateMedia,
)
exhibitRoutes.patch('/:id', exhibitController.update)
exhibitRoutes.delete('/:id', exhibitController.remove)

export default exhibitRoutes
