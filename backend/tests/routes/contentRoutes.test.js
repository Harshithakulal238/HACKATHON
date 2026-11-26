import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import app from '../../src/app.js'
import { databasePool } from '../../src/config/database.js'
import { registerCurator } from '../../src/services/authService.js'

const firstEmail = `content-test-${randomUUID()}@example.test`
const secondEmail = `content-test-${randomUUID()}@example.test`
const museumIds = []
let firstCurator
let secondCurator
let server
let baseUrl

async function send(path, { token, method = 'GET', body } = {}) {
  const headers = {}
  if (token) {
    headers.authorization = `Bearer ${token}`
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  return {
    status: response.status,
    body: response.status === 204 ? undefined : await response.json(),
  }
}

before(async () => {
  firstCurator = await registerCurator({
    fullName: 'First Content Test Curator',
    museumName: `Content API Test Museum ${randomUUID()}`,
    email: firstEmail,
    password: 'a-secure-content-test-password',
  })
  museumIds.push(firstCurator.user.museumId)

  secondCurator = await registerCurator({
    fullName: 'Second Content Test Curator',
    museumName: `Content API Test Museum ${randomUUID()}`,
    email: secondEmail,
    password: 'a-secure-content-test-password',
  })
  museumIds.push(secondCurator.user.museumId)

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
    if (museumIds.length > 0) {
      await client.query(
        `DELETE FROM public.walking_paths
         WHERE floorplan_id IN (
           SELECT id FROM public.floorplans WHERE museum_id = ANY($1::bigint[])
         )`,
        [museumIds],
      )
      await client.query(
        'DELETE FROM public.map_nodes WHERE museum_id = ANY($1::bigint[])',
        [museumIds],
      )
      await client.query(
        'DELETE FROM public.exhibits WHERE museum_id = ANY($1::bigint[])',
        [museumIds],
      )
      await client.query(
        'DELETE FROM public.galleries WHERE museum_id = ANY($1::bigint[])',
        [museumIds],
      )
      await client.query(
        'DELETE FROM public.categories WHERE museum_id = ANY($1::bigint[])',
        [museumIds],
      )
      await client.query(
        'DELETE FROM public.floorplans WHERE museum_id = ANY($1::bigint[])',
        [museumIds],
      )
      await client.query(
        'DELETE FROM public.users WHERE museum_id = ANY($1::bigint[])',
        [museumIds],
      )
      await client.query(
        'DELETE FROM public.museums WHERE id = ANY($1::bigint[])',
        [museumIds],
      )
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

test('curator content APIs validate input and isolate all records by museum', async () => {
  const unauthenticated = await send('/api/exhibits')
  assert.equal(unauthenticated.status, 401)

  const workerToken = jwt.sign(
    { museumId: firstCurator.user.museumId, role: 'worker' },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      audience: 'leviosa-client',
      expiresIn: '1m',
      issuer: 'leviosa-api',
      subject: 'worker-test',
    },
  )
  const wrongRole = await send('/api/galleries', { token: workerToken })
  assert.equal(wrongRole.status, 403)

  const museumResponse = await send('/api/museums/me', {
    token: firstCurator.accessToken,
  })
  assert.equal(museumResponse.status, 200)
  assert.equal(museumResponse.body.museum.id, firstCurator.user.museumId)

  const museumUpdate = await send('/api/museums/me', {
    token: firstCurator.accessToken,
    method: 'PATCH',
    body: { name: 'Updated Content Test Museum' },
  })
  assert.equal(museumUpdate.status, 200)
  assert.equal(museumUpdate.body.museum.name, 'Updated Content Test Museum')

  const rejectedMuseumId = await send('/api/museums/me', {
    token: firstCurator.accessToken,
    method: 'PATCH',
    body: { museumId: secondCurator.user.museumId },
  })
  assert.equal(rejectedMuseumId.status, 400)

  const galleryResponse = await send('/api/galleries', {
    token: firstCurator.accessToken,
    method: 'POST',
    body: { name: 'North Gallery', description: 'First gallery' },
  })
  assert.equal(galleryResponse.status, 201)
  const gallery = galleryResponse.body.gallery

  const categoryResponse = await send('/api/categories', {
    token: firstCurator.accessToken,
    method: 'POST',
    body: { name: 'Sculpture', description: 'Sculpture exhibits' },
  })
  assert.equal(categoryResponse.status, 201)
  const category = categoryResponse.body.category

  const galleryUpdate = await send(`/api/galleries/${gallery.id}`, {
    token: firstCurator.accessToken,
    method: 'PATCH',
    body: { description: 'Updated gallery description' },
  })
  const categoryUpdate = await send(`/api/categories/${category.id}`, {
    token: firstCurator.accessToken,
    method: 'PATCH',
    body: { description: 'Updated category description' },
  })
  assert.equal(galleryUpdate.status, 200)
  assert.equal(galleryUpdate.body.gallery.description, 'Updated gallery description')
  assert.equal(categoryUpdate.status, 200)
  assert.equal(categoryUpdate.body.category.description, 'Updated category description')

  const duplicateGallery = await send('/api/galleries', {
    token: firstCurator.accessToken,
    method: 'POST',
    body: { name: 'North Gallery' },
  })
  assert.equal(duplicateGallery.status, 409)

  const otherGalleryResponse = await send('/api/galleries', {
    token: secondCurator.accessToken,
    method: 'POST',
    body: { name: 'Other Museum Gallery' },
  })
  const otherCategoryResponse = await send('/api/categories', {
    token: secondCurator.accessToken,
    method: 'POST',
    body: { name: 'Other Museum Category' },
  })
  assert.equal(otherGalleryResponse.status, 201)
  assert.equal(otherCategoryResponse.status, 201)

  const otherGalleryList = await send('/api/galleries', {
    token: secondCurator.accessToken,
  })
  assert.deepEqual(
    otherGalleryList.body.galleries.map((item) => item.id),
    [otherGalleryResponse.body.gallery.id],
  )

  const crossMuseumGallery = await send(`/api/galleries/${gallery.id}`, {
    token: secondCurator.accessToken,
  })
  assert.equal(crossMuseumGallery.status, 404)

  const crossMuseumGalleryUpdate = await send(`/api/galleries/${gallery.id}`, {
    token: secondCurator.accessToken,
    method: 'PATCH',
    body: { name: 'Attempted cross-museum edit' },
  })
  assert.equal(crossMuseumGalleryUpdate.status, 404)

  const rejectedCrossMuseumExhibit = await send('/api/exhibits', {
    token: firstCurator.accessToken,
    method: 'POST',
    body: {
      galleryId: otherGalleryResponse.body.gallery.id,
      categoryId: otherCategoryResponse.body.category.id,
      name: 'Invalid cross-museum exhibit',
      estimatedVisitMinutes: 10,
    },
  })
  assert.equal(rejectedCrossMuseumExhibit.status, 400)

  const exhibitResponse = await send('/api/exhibits', {
    token: firstCurator.accessToken,
    method: 'POST',
    body: {
      galleryId: gallery.id,
      categoryId: category.id,
      name: 'Bronze Sculpture',
      descriptionEn: 'An English description.',
      descriptionKn: 'Kannada description.',
      estimatedVisitMinutes: 8,
      isAvailable: true,
    },
  })
  assert.equal(exhibitResponse.status, 201)
  const exhibit = exhibitResponse.body.exhibit

  const exhibitUpdate = await send(`/api/exhibits/${exhibit.id}`, {
    token: firstCurator.accessToken,
    method: 'PATCH',
    body: { isAvailable: false },
  })
  assert.equal(exhibitUpdate.status, 200)
  assert.equal(exhibitUpdate.body.exhibit.isAvailable, false)

  const crossMuseumExhibit = await send(`/api/exhibits/${exhibit.id}`, {
    token: secondCurator.accessToken,
  })
  assert.equal(crossMuseumExhibit.status, 404)

  const blockedGalleryDelete = await send(`/api/galleries/${gallery.id}`, {
    token: firstCurator.accessToken,
    method: 'DELETE',
  })
  assert.equal(blockedGalleryDelete.status, 409)

  const blockedCategoryDelete = await send(`/api/categories/${category.id}`, {
    token: firstCurator.accessToken,
    method: 'DELETE',
  })
  assert.equal(blockedCategoryDelete.status, 409)

  const exhibitDelete = await send(`/api/exhibits/${exhibit.id}`, {
    token: firstCurator.accessToken,
    method: 'DELETE',
  })
  assert.equal(exhibitDelete.status, 204)

  const galleryDelete = await send(`/api/galleries/${gallery.id}`, {
    token: firstCurator.accessToken,
    method: 'DELETE',
  })
  const categoryDelete = await send(`/api/categories/${category.id}`, {
    token: firstCurator.accessToken,
    method: 'DELETE',
  })
  assert.equal(galleryDelete.status, 409)
  assert.equal(categoryDelete.status, 409)
})
