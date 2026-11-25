import express from 'express'
import healthRoutes from './routes/healthRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js'

const app = express()

app.use(express.json({ limit: '100kb' }))
app.use('/api/health', healthRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
