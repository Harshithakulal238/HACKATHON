import { apiRequest } from './api.js'

export function registerCurator(details) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: details,
  })
}

export function loginCurator(credentials) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

export function loginWorker(credentials) {
  return apiRequest('/auth/worker-login', {
    method: 'POST',
    body: credentials,
  })
}

export function getCurrentUser(token) {
  return apiRequest('/auth/me', { token })
}
