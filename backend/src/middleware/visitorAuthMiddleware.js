import { findVisitorSessionByToken } from '../services/visitorSessionService.js'

export async function authenticateVisitor(request, _response, next) {
  try {
    const token = request.get('x-session-token')
    if (!token) {
      const error = new Error('A visitor session token is required.')
      error.statusCode = 401
      throw error
    }
    request.visitorSession = await findVisitorSessionByToken(token)
    next()
  } catch (error) {
    next(error)
  }
}
