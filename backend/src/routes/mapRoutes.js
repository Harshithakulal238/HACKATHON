import { Router } from 'express'
import * as mapController from '../controllers/mapController.js'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleMiddleware.js'
import {
  floorplanUpload,
  handleUploadError,
} from '../middleware/uploadMiddleware.js'

const mapRoutes = Router()

mapRoutes.use(authenticate, requireRole('curator'))
mapRoutes.get('/floorplans', mapController.list)
mapRoutes.post('/floorplans', mapController.create)
mapRoutes.post(
  '/floorplans/upload',
  floorplanUpload,
  handleUploadError,
  mapController.uploadSvg,
)
mapRoutes.patch(
  '/floorplans/:id/svg',
  floorplanUpload,
  handleUploadError,
  mapController.replaceSvg,
)
mapRoutes.get('/floorplans/:id', mapController.getById)
mapRoutes.post('/floorplans/:floorplanId/nodes', mapController.addNode)
mapRoutes.patch(
  '/floorplans/:floorplanId/nodes/:nodeId',
  mapController.updateNode,
)
mapRoutes.delete(
  '/floorplans/:floorplanId/nodes/:nodeId',
  mapController.removeNode,
)
mapRoutes.post('/floorplans/:floorplanId/paths', mapController.addPath)
mapRoutes.patch(
  '/floorplans/:floorplanId/paths/:pathId',
  mapController.updatePath,
)
mapRoutes.delete(
  '/floorplans/:floorplanId/paths/:pathId',
  mapController.removePath,
)

export default mapRoutes
