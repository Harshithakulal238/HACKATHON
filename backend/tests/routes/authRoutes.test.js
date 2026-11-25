import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import app from '../../src/app.js'
import { databasePool } from '../../src/config/database.js'

const email = `auth-test-${randomUUID()}@example.test`
const museumName = `Auth test museum ${randomUUID()}`
let server
let baseUrl

before(async () => {
  server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }

  const client = await databasePool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      'DELETE FROM public.users WHERE email = $1 RETURNING museum_id',
      [email],
    )
    if (result.rows[0]) {
      await client.query('DELETE FROM public.museums WHERE id = $1', [
        result.rows[0].museum_id,
      ])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await databasePool.end()
  }
})

test('curator can register, log in, and access a protected identity endpoint', async () => {
  const registrationResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test Curator',
      museumName,
      email,
      password: 'a-secure-test-password',
    }),
  })
  assert.equal(registrationResponse.status, 201)
  const registration = await registrationResponse.json()
  assert.equal(registration.user.email, email)
  assert.equal(registration.user.role, 'curator')
  assert.equal(registration.tokenType, 'Bearer')
  assert.ok(registration.accessToken)
  assert.equal('password_hash' in registration.user, false)

  const currentUserResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { authorization: `Bearer ${registration.accessToken}` },
  })
  assert.equal(currentUserResponse.status, 200)
  const currentUser = await currentUserResponse.json()
  assert.equal(currentUser.user.id, registration.user.id)
  assert.equal(currentUser.user.museumId, registration.user.museumId)

  const missingTokenResponse = await fetch(`${baseUrl}/api/auth/me`)
  assert.equal(missingTokenResponse.status, 401)

  const invalidTokenResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { authorization: 'Bearer invalid-token' },
  })
  assert.equal(invalidTokenResponse.status, 401)

  const invalidLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'wrong-password' }),
  })
  assert.equal(invalidLoginResponse.status, 401)

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'a-secure-test-password' }),
  })
  assert.equal(loginResponse.status, 200)
  assert.equal((await loginResponse.json()).user.id, registration.user.id)

  const duplicateRegistrationResponse = await fetch(
    `${baseUrl}/api/auth/register`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Duplicate Curator',
        museumName: 'Duplicate attempt museum',
        email: email.toUpperCase(),
        password: 'a-secure-test-password',
      }),
    },
  )
  assert.equal(duplicateRegistrationResponse.status, 409)

  const invalidRegistrationResponse = await fetch(
    `${baseUrl}/api/auth/register`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Curator',
        museumName,
        email: 'not-an-email',
        password: 'short',
      }),
    },
  )
  assert.equal(invalidRegistrationResponse.status, 400)
})
