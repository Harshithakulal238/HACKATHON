import { Router } from 'express'

const healthRoutes = Router()

healthRoutes.get('/', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'leviosa-backend',
  })
})

export default healthRoutes
