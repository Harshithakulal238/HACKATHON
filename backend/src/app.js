import express from 'express'
import { uploadsDirectory } from './config/storage.js'
import healthRoutes from './routes/healthRoutes.js'
import authRoutes from './routes/authRoutes.js'
import museumRoutes from './routes/museumRoutes.js'
import galleryRoutes from './routes/galleryRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import exhibitRoutes from './routes/exhibitRoutes.js'
import workerRoutes from './routes/workerRoutes.js'
import mapRoutes from './routes/mapRoutes.js'
import workerSessionRoutes from './routes/workerSessionRoutes.js'
import visitorRoutes from './routes/visitorRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js'

const app = express()

app.use(express.json({ limit: '100kb' }))
app.use(
  '/uploads',
  express.static(uploadsDirectory, {
    dotfiles: 'deny',
    fallthrough: true,
    index: false,
  }),
)
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/museums', museumRoutes)
app.use('/api/galleries', galleryRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/exhibits', exhibitRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/maps', mapRoutes)
app.use('/api/worker/sessions', workerSessionRoutes)
app.use('/api/visitor', visitorRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
