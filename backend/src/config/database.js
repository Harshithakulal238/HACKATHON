import pg from 'pg'
import { environment } from './environment.js'

const { Pool } = pg

export const databasePool = new Pool({
  connectionString: environment.databaseUrl,
})

databasePool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error)
})
