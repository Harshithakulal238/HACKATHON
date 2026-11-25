import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { databasePool } from '../src/config/database.js'
import { environment } from '../src/config/environment.js'

const migrationDirectory = fileURLToPath(
  new URL('../../database/migrations/', import.meta.url),
)
const migrationLockId = 724019361

async function runMigrations() {
  if (!environment.databaseUrl) {
    throw new Error('DATABASE_URL must be set before running migrations.')
  }

  const migrationFiles = (await readdir(migrationDirectory, {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort()

  const client = await databasePool.connect()
  let lockAcquired = false

  try {
    await client.query('SELECT pg_advisory_lock($1)', [migrationLockId])
    lockAcquired = true

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const appliedResult = await client.query(
      'SELECT filename FROM public.schema_migrations',
    )
    const appliedFiles = new Set(
      appliedResult.rows.map((row) => row.filename),
    )
    let pendingCount = 0

    for (const filename of migrationFiles) {
      if (appliedFiles.has(filename)) {
        continue
      }

      const sql = await readFile(
        new URL(`../../database/migrations/${filename}`, import.meta.url),
        'utf8',
      )

      if (!sql.trim()) {
        throw new Error(`Migration ${filename} is empty.`)
      }

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO public.schema_migrations (filename) VALUES ($1)',
          [filename],
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${filename} failed: ${error.message}`, {
          cause: error,
        })
      }

      pendingCount += 1
      console.log(`Applied migration: ${filename}`)
    }

    if (pendingCount === 0) {
      console.log('No pending migrations. Migration history is ready.')
    }
  } finally {
    try {
      if (lockAcquired) {
        await client.query('SELECT pg_advisory_unlock($1)', [migrationLockId])
      }
    } finally {
      client.release()
    }
  }
}

try {
  await runMigrations()
} catch (error) {
  console.error('Database migration failed:', error.message)
  process.exitCode = 1
} finally {
  await databasePool.end()
}
