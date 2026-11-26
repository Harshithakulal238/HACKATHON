import { apiRequest } from './api.js'

export function listWorkers(token) {
  return apiRequest('/workers', { token })
}

export function createWorker(token, details) {
  return apiRequest('/workers', { method: 'POST', token, body: details })
}

export function listGalleries(token) {
  return apiRequest('/galleries', { token })
}

export function createGallery(token, details) {
  return apiRequest('/galleries', { method: 'POST', token, body: details })
}

export function updateGallery(token, id, details) {
  return apiRequest(`/galleries/${id}`, { method: 'PATCH', token, body: details })
}

export function deleteGallery(token, id) {
  return apiRequest(`/galleries/${id}`, { method: 'DELETE', token })
}

export function listCategories(token) {
  return apiRequest('/categories', { token })
}

export function createCategory(token, details) {
  return apiRequest('/categories', { method: 'POST', token, body: details })
}

export function updateCategory(token, id, details) {
  return apiRequest(`/categories/${id}`, { method: 'PATCH', token, body: details })
}

export function deleteCategory(token, id) {
  return apiRequest(`/categories/${id}`, { method: 'DELETE', token })
}

export function listExhibits(token) {
  return apiRequest('/exhibits', { token })
}

export function createExhibit(token, details) {
  return apiRequest('/exhibits', { method: 'POST', token, body: details })
}

export function updateExhibit(token, id, details) {
  return apiRequest(`/exhibits/${id}`, { method: 'PATCH', token, body: details })
}

export function deleteExhibit(token, id) {
  return apiRequest(`/exhibits/${id}`, { method: 'DELETE', token })
}

export function uploadExhibitMedia(token, id, files) {
  const body = new FormData()
  for (const [field, file] of Object.entries(files)) {
    if (file) {
      body.append(field, file)
    }
  }
  return apiRequest(`/exhibits/${id}/media`, {
    method: 'POST',
    token,
    body,
  })
}

export function listFloorplans(token) {
  return apiRequest('/maps/floorplans', { token })
}

export function getFloorplan(token, id) {
  return apiRequest(`/maps/floorplans/${id}`, { token })
}

export function uploadFloorplanSvg(token, file) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest('/maps/floorplans/upload', {
    method: 'POST',
    token,
    body,
  })
}

export function replaceFloorplanSvg(token, id, file) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest(`/maps/floorplans/${id}/svg`, {
    method: 'PATCH',
    token,
    body,
  })
}

export function createFloorplan(token, details) {
  return apiRequest('/maps/floorplans', { method: 'POST', token, body: details })
}

export function createMapNode(token, floorplanId, details) {
  return apiRequest(`/maps/floorplans/${floorplanId}/nodes`, {
    method: 'POST',
    token,
    body: details,
  })
}

export function deleteMapNode(token, floorplanId, nodeId) {
  return apiRequest(`/maps/floorplans/${floorplanId}/nodes/${nodeId}`, {
    method: 'DELETE',
    token,
  })
}

export function createWalkingPath(token, floorplanId, details) {
  return apiRequest(`/maps/floorplans/${floorplanId}/paths`, {
    method: 'POST',
    token,
    body: details,
  })
}

export function deleteWalkingPath(token, floorplanId, pathId) {
  return apiRequest(`/maps/floorplans/${floorplanId}/paths/${pathId}`, {
    method: 'DELETE',
    token,
  })
}

export function getAnalytics(token, filters = {}) {
  const query = new URLSearchParams()
  if (filters.from) query.set('from', filters.from)
  if (filters.to) query.set('to', filters.to)
  const suffix = query.size ? `?${query.toString()}` : ''
  return apiRequest(`/analytics/overview${suffix}`, { token })
}
