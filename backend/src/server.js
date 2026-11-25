import app from './app.js'
import { databasePool } from './config/database.js'
import { environment } from './config/environment.js'

const server = app.listen(environment.port, () => {
  console.log(`Léviōsa API listening on port ${environment.port}`)
})

let isShuttingDown = false

function shutdown(signal) {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  console.log(`${signal} received; shutting down gracefully.`)

  server.close(async (serverError) => {
    try {
      await databasePool.end()
    } catch (databaseError) {
      console.error('Failed to close PostgreSQL pool:', databaseError)
      process.exitCode = 1
    }

    if (serverError) {
      console.error('Failed to close HTTP server:', serverError)
      process.exitCode = 1
    }
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
