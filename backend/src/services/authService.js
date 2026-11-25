import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { databasePool } from '../config/database.js'
import { environment } from '../config/environment.js'

const passwordRounds = 12
const passwordMinimumLength = 12
const passwordMaximumBytes = 72
const tokenLifetime = '15m'
const tokenIssuer = 'leviosa-api'
const tokenAudience = 'leviosa-client'

function createHttpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function getJwtSecret() {
  const secret = environment.jwtSecret
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw createHttpError(503, 'Authentication is not configured.')
  }

  return secret
}

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function validateRegistration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createHttpError(400, 'A JSON object is required.')
  }

  const { fullName, email, password, museumName } = input
  const passwordLength =
    typeof password === 'string' ? Array.from(password).length : 0
  if (
    typeof fullName !== 'string' ||
    !fullName.trim() ||
    typeof museumName !== 'string' ||
    !museumName.trim() ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== 'string' ||
    passwordLength < passwordMinimumLength ||
    Buffer.byteLength(password, 'utf8') > passwordMaximumBytes
  ) {
    throw createHttpError(
      400,
      'Provide a name, museum name, valid email, and a password with at least 12 characters and no more than 72 UTF-8 bytes.',
    )
  }

  return {
    fullName: fullName.trim(),
    museumName: museumName.trim(),
    email: normalizeEmail(email),
    password,
  }
}

function validateWorkerRegistration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createHttpError(400, 'A JSON object is required.')
  }

  const { fullName, email, password } = input
  const passwordLength =
    typeof password === 'string' ? Array.from(password).length : 0
  if (
    typeof fullName !== 'string' ||
    !fullName.trim() ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== 'string' ||
    passwordLength < passwordMinimumLength ||
    Buffer.byteLength(password, 'utf8') > passwordMaximumBytes
  ) {
    throw createHttpError(
      400,
      'Provide a name, valid email, and a password with at least 12 characters and no more than 72 UTF-8 bytes.',
    )
  }

  return {
    fullName: fullName.trim(),
    email: normalizeEmail(email),
    password,
  }
}

function validateLogin(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    typeof input.email !== 'string' ||
    typeof input.password !== 'string' ||
    !input.email.trim() ||
    !input.password
  ) {
    throw createHttpError(400, 'Provide an email and password.')
  }
  return {
    email: normalizeEmail(input.email),
    password: input.password,
  }
}

function toPublicUser(row) {
  return {
    id: row.id,
    museumId: row.museum_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
  }
}

function createAccessToken(user, secret) {
  return jwt.sign(
    { museumId: user.museumId, role: user.role },
    secret,
    {
      algorithm: 'HS256',
      audience: tokenAudience,
      expiresIn: tokenLifetime,
      issuer: tokenIssuer,
      subject: String(user.id),
    },
  )
}

function createSessionResponse(user, secret) {
  return {
    user,
    accessToken: createAccessToken(user, secret),
    tokenType: 'Bearer',
    expiresIn: tokenLifetime,
  }
}

export async function registerCurator(input) {
  const registration = validateRegistration(input)
  const secret = getJwtSecret()
  const passwordHash = await bcrypt.hash(registration.password, passwordRounds)
  const client = await databasePool.connect()

  try {
    await client.query('BEGIN')
    try {
      const museumResult = await client.query(
        'INSERT INTO public.museums (name) VALUES ($1) RETURNING id',
        [registration.museumName],
      )
      const userResult = await client.query(
        `INSERT INTO public.users (museum_id, full_name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         RETURNING id, museum_id, full_name, email, role`,
        [
          museumResult.rows[0].id,
          registration.fullName,
          registration.email,
          passwordHash,
        ],
      )

      await client.query('COMMIT')
      return createSessionResponse(toPublicUser(userResult.rows[0]), secret)
    } catch (error) {
      await client.query('ROLLBACK')
      if (
        error.code === '23505' &&
        error.constraint === 'users_email_lower_unique_idx'
      ) {
        throw createHttpError(409, 'An account with this email already exists.')
      }

      throw error
    }
  } finally {
    client.release()
  }
}

export async function loginCurator(input) {
  const credentials = validateLogin(input)
  const secret = getJwtSecret()
  const result = await databasePool.query(
    `SELECT id, museum_id, full_name, email, password_hash, role
     FROM public.users
     WHERE email = $1 AND role = 'curator'`,
    [credentials.email],
  )
  const user = result.rows[0]
  const passwordMatches =
    user && (await bcrypt.compare(credentials.password, user.password_hash))

  if (!passwordMatches) {
    throw createHttpError(401, 'Invalid email or password.')
  }

  return createSessionResponse(toPublicUser(user), secret)
}

export async function createWorker(museumId, input) {
  const worker = validateWorkerRegistration(input)
  const passwordHash = await bcrypt.hash(worker.password, passwordRounds)

  try {
    const result = await databasePool.query(
      `INSERT INTO public.users (museum_id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'worker')
       RETURNING id, museum_id, full_name, email, role`,
      [museumId, worker.fullName, worker.email, passwordHash],
    )
    return toPublicUser(result.rows[0])
  } catch (error) {
    if (
      error.code === '23505' &&
      error.constraint === 'users_email_lower_unique_idx'
    ) {
      throw createHttpError(409, 'An account with this email already exists.')
    }
    throw error
  }
}

export async function listWorkers(museumId) {
  const result = await databasePool.query(
    `SELECT id, museum_id, full_name, email, role
     FROM public.users
     WHERE museum_id = $1 AND role = 'worker'
     ORDER BY full_name, id`,
    [museumId],
  )
  return result.rows.map(toPublicUser)
}

export async function loginWorker(input) {
  const credentials = validateLogin(input)
  const secret = getJwtSecret()
  const result = await databasePool.query(
    `SELECT id, museum_id, full_name, email, password_hash, role
     FROM public.users
     WHERE email = $1 AND role = 'worker'`,
    [credentials.email],
  )
  const user = result.rows[0]
  const passwordMatches =
    user && (await bcrypt.compare(credentials.password, user.password_hash))

  if (!passwordMatches) {
    throw createHttpError(401, 'Invalid email or password.')
  }

  return createSessionResponse(toPublicUser(user), secret)
}

export function verifyAccessToken(token) {
  const secret = getJwtSecret()
  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    audience: tokenAudience,
    issuer: tokenIssuer,
  })
}
