import { verifyAccessToken } from '../services/authService.js'

const invalidCredentials = {
  error: {
    message: 'A valid bearer token is required.',
  },
}

export function authenticate(request, response, next) {
  const authorization = request.get('authorization') ?? ''
  const match = authorization.match(/^Bearer ([^\s]+)$/i)

  if (!match) {
    response.status(401).json(invalidCredentials)
    return
  }

  try {
    const claims = verifyAccessToken(match[1])
    if (
      typeof claims !== 'object' ||
      typeof claims.sub !== 'string' ||
      typeof claims.museumId !== 'string' ||
      typeof claims.role !== 'string'
    ) {
      response.status(401).json(invalidCredentials)
      return
    }

    request.user = {
      id: claims.sub,
      museumId: claims.museumId,
      role: claims.role,
    }
    next()
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      response.status(401).json(invalidCredentials)
      return
    }

    next(error)
  }
}
