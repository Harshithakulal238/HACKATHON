import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import app from '../../src/app.js'
import { databasePool } from '../../src/config/database.js'
import { registerCurator } from '../../src/services/authService.js'

const email = `prototype-${randomUUID()}@example.test`
const museumIds = []
let curator
let worker
let server
let baseUrl

async function send(path, { token, sessionToken, method = 'GET', body } = {}) {
  const headers = {}
  if (token) {
    headers.authorization = `Bearer ${token}`
  }
  if (sessionToken) {
    headers['x-session-token'] = sessionToken
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
  server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`

  curator = await registerCurator({
    fullName: 'Prototype Test Curator',
    museumName: `Prototype Test Museum ${randomUUID()}`,
    email,
    password: 'a-secure-prototype-test-password',
  })
  museumIds.push(curator.user.museumId)
})

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }

  if (museumIds.length === 0) {
    await databasePool.end()
    return
  }

  const client = await databasePool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `DELETE FROM public.visitor_feedback
       WHERE session_id IN (
         SELECT id FROM public.visitor_sessions WHERE museum_id = ANY($1::bigint[])
       )`,
      [museumIds],
    )
    await client.query(
      `DELETE FROM public.visitor_events
       WHERE session_id IN (
         SELECT id FROM public.visitor_sessions WHERE museum_id = ANY($1::bigint[])
       )`,
      [museumIds],
    )
    await client.query(
      `DELETE FROM public.route_stops
       WHERE session_id IN (
         SELECT id FROM public.visitor_sessions WHERE museum_id = ANY($1::bigint[])
       )`,
      [museumIds],
    )
    await client.query(
      `DELETE FROM public.visitor_routes
       WHERE session_id IN (
         SELECT id FROM public.visitor_sessions WHERE museum_id = ANY($1::bigint[])
       )`,
      [museumIds],
    )
    await client.query(
      `DELETE FROM public.visitor_session_interests
       WHERE session_id IN (
         SELECT id FROM public.visitor_sessions WHERE museum_id = ANY($1::bigint[])
       )`,
      [museumIds],
    )
    await client.query(
      'DELETE FROM public.visitor_sessions WHERE museum_id = ANY($1::bigint[])',
      [museumIds],
    )
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
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await databasePool.end()
  }
})

test('worker can create a route and visitor actions persist and update analytics', async () => {
  const workerCreated = await send('/api/workers', {
    token: curator.accessToken,
    method: 'POST',
    body: {
      fullName: 'Prototype Test Worker',
      email: `worker-${randomUUID()}@example.test`,
      password: 'a-secure-worker-test-password',
    },
  })
  assert.equal(workerCreated.status, 201)
  assert.equal(workerCreated.body.worker.role, 'worker')

  const workerLogin = await send('/api/auth/worker-login', {
    method: 'POST',
    body: {
      email: workerCreated.body.worker.email,
      password: 'a-secure-worker-test-password',
    },
  })
  assert.equal(workerLogin.status, 200)
  worker = workerLogin.body

  const gallery = await send('/api/galleries', {
    token: curator.accessToken,
    method: 'POST',
    body: { name: 'Prototype Gallery' },
  })
  const category = await send('/api/categories', {
    token: curator.accessToken,
    method: 'POST',
    body: { name: 'History' },
  })
  assert.equal(gallery.status, 201)
  assert.equal(category.status, 201)

  const exhibit = await send('/api/exhibits', {
    token: curator.accessToken,
    method: 'POST',
    body: {
      galleryId: gallery.body.gallery.id,
      categoryId: category.body.category.id,
      name: 'Test Exhibit',
      descriptionEn: 'English story',
      descriptionKn: 'Kannada story',
      estimatedVisitMinutes: 2,
    },
  })
  assert.equal(exhibit.status, 201)
  assert.match(exhibit.body.exhibit.shortCode, /^EX-/)
  const secondExhibit = await send('/api/exhibits', {
    token: curator.accessToken,
    method: 'POST',
    body: {
      galleryId: gallery.body.gallery.id,
      categoryId: category.body.category.id,
      name: 'Second Test Exhibit',
      descriptionEn: 'Second English story',
      descriptionKn: 'Second Kannada story',
      estimatedVisitMinutes: 2,
    },
  })
  assert.equal(secondExhibit.status, 201)

  const floorplan = await send('/api/maps/floorplans', {
    token: curator.accessToken,
    method: 'POST',
    body: {
      name: 'Test Floor',
      floorLabel: 'Ground floor',
      svgAssetPath: '/uploads/floorplans/test.svg',
      viewBoxWidth: 100,
      viewBoxHeight: 100,
    },
  })
  assert.equal(floorplan.status, 201)
  const floorplanId = floorplan.body.floorplan.id
  const entrance = await send(`/api/maps/floorplans/${floorplanId}/nodes`, {
    token: curator.accessToken,
    method: 'POST',
    body: { nodeType: 'entrance', label: 'Entrance', xCoordinate: 10, yCoordinate: 50 },
  })
  const exhibitNode = await send(`/api/maps/floorplans/${floorplanId}/nodes`, {
    token: curator.accessToken,
    method: 'POST',
    body: {
      nodeType: 'exhibit',
      exhibitId: exhibit.body.exhibit.id,
      label: 'Test Exhibit',
      xCoordinate: 50,
      yCoordinate: 50,
    },
  })
  const secondExhibitNode = await send(`/api/maps/floorplans/${floorplanId}/nodes`, {
    token: curator.accessToken,
    method: 'POST',
    body: {
      nodeType: 'exhibit',
      exhibitId: secondExhibit.body.exhibit.id,
      label: 'Second Test Exhibit',
      xCoordinate: 70,
      yCoordinate: 50,
    },
  })
  const exit = await send(`/api/maps/floorplans/${floorplanId}/nodes`, {
    token: curator.accessToken,
    method: 'POST',
    body: { nodeType: 'exit', label: 'Exit', xCoordinate: 90, yCoordinate: 50 },
  })
  assert.equal(entrance.status, 201)
  assert.equal(exhibitNode.status, 201)
  assert.equal(secondExhibitNode.status, 201)
  assert.equal(exit.status, 201)

  for (const [fromNode, toNode] of [
    [entrance.body.node.id, exhibitNode.body.node.id],
    [exhibitNode.body.node.id, secondExhibitNode.body.node.id],
    [secondExhibitNode.body.node.id, exit.body.node.id],
  ]) {
    const path = await send(`/api/maps/floorplans/${floorplanId}/paths`, {
      token: curator.accessToken,
      method: 'POST',
      body: {
        fromNodeId: fromNode,
        toNodeId: toNode,
        estimatedWalkingSeconds: 30,
      },
    })
    assert.equal(path.status, 201)
  }

  const deniedWorkerContent = await send('/api/exhibits', {
    token: worker.accessToken,
  })
  assert.equal(deniedWorkerContent.status, 403)

  const createdTour = await send('/api/worker/sessions', {
    token: worker.accessToken,
    method: 'POST',
    body: {
      interests: [category.body.category.id],
      availableMinutes: 5,
    },
  })
  assert.equal(createdTour.status, 201)
  assert.equal(createdTour.body.session.status, 'ready')
  assert.equal(createdTour.body.route.stops[0].exhibitId, exhibit.body.exhibit.id)
  assert.ok(createdTour.body.routeToken)

  const started = await send('/api/visitor/sessions/start', {
    method: 'POST',
    body: { token: createdTour.body.routeToken },
  })
  assert.equal(started.status, 200)
  assert.equal(started.body.session.status, 'active')
  const visitorToken = createdTour.body.routeToken
  const visitorOptions = { sessionToken: visitorToken }

  const completeBeforeScan = await send(
    `/api/visitor/exhibits/${exhibit.body.exhibit.id}/complete`,
    { ...visitorOptions, method: 'POST', body: {} },
  )
  assert.equal(completeBeforeScan.status, 409)

  const scanned = await send('/api/visitor/exhibits/scan', {
    ...visitorOptions,
    method: 'POST',
    body: { code: exhibit.body.exhibit.shortCode },
  })
  assert.equal(scanned.status, 200)
  assert.equal(scanned.body.exhibit.descriptionEn, 'English story')
  assert.equal(scanned.body.exhibit.descriptionKn, 'Kannada story')

  for (const eventType of ['STORY_OPENED', 'AUDIO_STARTED', 'AUDIO_COMPLETED']) {
    const event = await send('/api/visitor/events', {
      ...visitorOptions,
      method: 'POST',
      body: { eventType, exhibitId: exhibit.body.exhibit.id, language: 'en' },
    })
    assert.equal(event.status, 201)
  }
  const languageEvent = await send('/api/visitor/events', {
    ...visitorOptions,
    method: 'POST',
    body: { eventType: 'LANGUAGE_SELECTED', language: 'kn' },
  })
  assert.equal(languageEvent.status, 201)

  const completedStop = await send(
    `/api/visitor/exhibits/${exhibit.body.exhibit.id}/complete`,
    { ...visitorOptions, method: 'POST', body: {} },
  )
  assert.equal(completedStop.status, 200)
  assert.equal(completedStop.body.route.version, 2)
  assert.equal(
    completedStop.body.route.stops[0].status,
    'completed',
  )
  assert.equal(completedStop.body.route.stops[1].exhibitId, secondExhibit.body.exhibit.id)

  const unavailable = await send(`/api/exhibits/${secondExhibit.body.exhibit.id}`, {
    token: curator.accessToken,
    method: 'PATCH',
    body: { isAvailable: false },
  })
  assert.equal(unavailable.status, 200)
  const latestRoute = await send('/api/visitor/sessions/me', visitorOptions)
  assert.equal(latestRoute.status, 200)
  assert.equal(latestRoute.body.route.version, 3)
  assert.equal(
    latestRoute.body.route.stops.some((stop) => stop.exhibitId === secondExhibit.body.exhibit.id),
    false,
  )

  const feedback = await send(
    `/api/visitor/exhibits/${exhibit.body.exhibit.id}/feedback`,
    {
      ...visitorOptions,
      method: 'POST',
      body: { rating: 5, comment: 'Enjoyed the story.' },
    },
  )
  assert.equal(feedback.status, 201)

  const extended = await send('/api/visitor/sessions/extend', {
    ...visitorOptions,
    method: 'POST',
    body: { minutes: 10 },
  })
  assert.equal(extended.status, 200)
  assert.equal(extended.body.allocatedMinutes, 15)
  assert.equal(extended.body.route.version, 4)

  const finished = await send('/api/visitor/sessions/finish', {
    ...visitorOptions,
    method: 'POST',
    body: {},
  })
  assert.equal(finished.status, 200)

  const analytics = await send('/api/analytics/overview', {
    token: curator.accessToken,
  })
  assert.equal(analytics.status, 200)
  assert.equal(analytics.body.analytics.totalTours, 1)
  assert.equal(analytics.body.analytics.completedTours, 1)
  assert.equal(analytics.body.analytics.exhibitScans, 1)
  assert.equal(analytics.body.analytics.audioCompletionRate, 100)
  assert.equal(analytics.body.analytics.routeChanges, 3)
  assert.equal(analytics.body.analytics.skippedExhibits, 1)
  assert.equal(analytics.body.analytics.exhibits[0].name, 'Test Exhibit')
  assert.equal(analytics.body.analytics.feedback.averageRating, '5.00')
  assert.equal(analytics.body.analytics.languages[0].language, 'kn')
})
