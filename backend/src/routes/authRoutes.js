import { Router } from 'express'
import {
  getCurrentUser,
  login,
  register,
  workerLogin,
} from '../controllers/authController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const authRoutes = Router()

authRoutes.post('/register', register)
authRoutes.post('/login', login)
authRoutes.post('/worker-login', workerLogin)
authRoutes.get('/me', authenticate, getCurrentUser)

export default authRoutes
