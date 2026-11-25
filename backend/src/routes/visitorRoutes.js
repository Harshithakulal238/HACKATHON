import { Router } from 'express'
import * as visitorController from '../controllers/visitorController.js'
import { authenticateVisitor } from '../middleware/visitorAuthMiddleware.js'

const visitorRoutes = Router()

visitorRoutes.post('/sessions/start', visitorController.start)
visitorRoutes.use(authenticateVisitor)
visitorRoutes.get('/sessions/me', visitorController.getSession)
visitorRoutes.get('/sessions/map', visitorController.getMap)
visitorRoutes.post('/sessions/extend', visitorController.extend)
visitorRoutes.post('/sessions/finish', visitorController.finish)
visitorRoutes.post('/exhibits/scan', visitorController.scan)
visitorRoutes.post(
  '/exhibits/:exhibitId/complete',
  visitorController.complete,
)
visitorRoutes.post(
  '/exhibits/:exhibitId/feedback',
  visitorController.feedback,
)
visitorRoutes.post('/events', visitorController.interaction)

export default visitorRoutes
