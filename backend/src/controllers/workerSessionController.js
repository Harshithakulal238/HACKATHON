import {
  createVisitorSession,
  listWorkerSessions,
} from '../services/visitorSessionService.js'
import { listCategories } from '../services/categoryService.js'
import { listFloorplans } from '../services/mapService.js'

export async function categories(request, response) {
  const categories = await listCategories(request.user.museumId)
  response.status(200).json({ categories })
}

export async function floorplans(request, response) {
  const floorplans = await listFloorplans(request.user.museumId)
  response.status(200).json({ floorplans })
}

export async function list(request, response) {
  const sessions = await listWorkerSessions(request.user.id)
  response.status(200).json({ sessions })
}

export async function create(request, response) {
  const session = await createVisitorSession(
    request.user.museumId,
    request.user.id,
    request.body,
  )
  response.status(201).json(session)
}
