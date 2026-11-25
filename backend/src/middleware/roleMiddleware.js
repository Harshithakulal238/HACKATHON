export function requireRole(role) {
  return (request, response, next) => {
    if (!request.user) {
      response.status(401).json({
        error: {
          message: 'Authentication is required.',
        },
      })
      return
    }

    if (request.user.role !== role) {
      response.status(403).json({
        error: {
          message: 'You do not have permission to access this resource.',
        },
      })
      return
    }

    next()
  }
}
