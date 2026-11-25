import { apiRequest } from './api.js'

export function createVisitorTour(token, details) {
  return apiRequest('/worker/sessions', {
    method: 'POST',
    token,
    body: details,
  })
}

export function listWorkerTours(token) {
  return apiRequest('/worker/sessions', { token })
}

export function listTourCategories(token) {
  return apiRequest('/worker/sessions/categories', { token })
}

export function startVisitorTour(routeToken) {
  return apiRequest('/visitor/sessions/start', {
    method: 'POST',
    body: { token: routeToken },
  })
}

function visitorRequest(path, routeToken, options = {}) {
  return apiRequest(`/visitor${path}`, {
    ...options,
    headers: { 'x-session-token': routeToken },
  })
}

export function getVisitorTour(routeToken) {
  return visitorRequest('/sessions/me', routeToken)
}

export function getVisitorMap(routeToken) {
  return visitorRequest('/sessions/map', routeToken)
}

export function scanExhibit(routeToken, code) {
  return visitorRequest('/exhibits/scan', routeToken, {
    method: 'POST',
    body: { code },
  })
}

export function completeExhibit(routeToken, exhibitId, skipped = false) {
  return visitorRequest(`/exhibits/${exhibitId}/complete`, routeToken, {
    method: 'POST',
    body: { skipped },
  })
}

export function extendVisitorTour(routeToken, minutes) {
  return visitorRequest('/sessions/extend', routeToken, {
    method: 'POST',
    body: { minutes },
  })
}

export function finishVisitorTour(routeToken) {
  return visitorRequest('/sessions/finish', routeToken, {
    method: 'POST',
    body: {},
  })
}

export function submitExhibitFeedback(routeToken, exhibitId, details) {
  return visitorRequest(`/exhibits/${exhibitId}/feedback`, routeToken, {
    method: 'POST',
    body: details,
  })
}

export function recordVisitorEvent(routeToken, details) {
  return visitorRequest('/events', routeToken, {
    method: 'POST',
    body: details,
  })
}
