import {
  loginCurator,
  loginWorker,
  registerCurator,
} from '../services/authService.js'

export async function register(request, response) {
  const session = await registerCurator(request.body)
  response.status(201).json(session)
}

export async function login(request, response) {
  const session = await loginCurator(request.body)
  response.status(200).json(session)
}

export async function workerLogin(request, response) {
  const session = await loginWorker(request.body)
  response.status(200).json(session)
}

export function getCurrentUser(request, response) {
  response.status(200).json({ user: request.user })
}
