import {
  getMuseum,
  updateMuseum,
} from '../services/museumService.js'

export async function getCurrentMuseum(request, response) {
  const museum = await getMuseum(request.user.museumId)
  response.status(200).json({ museum })
}

export async function updateCurrentMuseum(request, response) {
  const museum = await updateMuseum(request.user.museumId, request.body)
  response.status(200).json({ museum })
}
