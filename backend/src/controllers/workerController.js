import {
  createWorker,
  listWorkers,
} from '../services/authService.js'

export async function list(request, response) {
  const workers = await listWorkers(request.user.museumId)
  response.status(200).json({ workers })
}

export async function create(request, response) {
  const worker = await createWorker(request.user.museumId, request.body)
  response.status(201).json({ worker })
}
