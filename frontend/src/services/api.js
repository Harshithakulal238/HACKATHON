const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '/api')
  .replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(
  path,
  { method = 'GET', token, body, headers: extraHeaders } = {},
) {
  const headers = new Headers(extraHeaders)
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) {
    headers.set('content-type', 'application/json')
  }
  if (token) {
    headers.set('authorization', `Bearer ${token}`)
  }

  let response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'Could not connect to the Léviōsa API. Check that the backend is running.',
      0,
    )
  }

  const responseText = await response.text()
  let payload = null
  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      throw new ApiError('The API returned an unreadable response.', response.status)
    }
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'The request could not be completed.',
      response.status,
    )
  }

  return payload
}
