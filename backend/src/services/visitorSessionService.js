import { createHash, randomBytes } from 'node:crypto'
import { databasePool } from '../config/database.js'
import { loadFloorplanGraph, createRouteRevision } from './routeService.js'
import { createHttpError } from '../utils/httpError.js'
import {
  validateId,
  validateObject,
  validatePositiveInteger,
  validateText,
} from '../utils/contentValidation.js'

function hashRouteToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

function calculateRemainingSeconds(session) {
  if (session.status !== 'active' || !session.startedAt) {
    return null
  }
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000),
  )
  return Math.max(0, session.allocatedMinutes * 60 - elapsedSeconds)
}

async function withTransaction(operation) {
  const client = await databasePool.connect()
  try {
    await client.query('BEGIN')
    const result = await operation(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function getSessionRow(client, sessionId, { lock = false } = {}) {
  const result = await client.query(
    `SELECT id, museum_id::text AS "museumId",
            worker_user_id::text AS "workerUserId",
            floorplan_id::text AS "floorplanId", status,
            allocated_minutes AS "allocatedMinutes",
            started_at AS "startedAt", completed_at AS "completedAt",
            current_node_id::text AS "currentNodeId",
            route_version AS "routeVersion", created_at AS "createdAt"
     FROM public.visitor_sessions
     WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
    [sessionId],
  )
  if (!result.rows[0]) {
    throw createHttpError(404, 'Visitor session not found.')
  }
  return result.rows[0]
}

async function getLatestRoute(client, sessionId) {
  const routeResult = await client.query(
    `SELECT id::text AS id, version, reason, created_at AS "createdAt"
     FROM public.visitor_routes
     WHERE session_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [sessionId],
  )
  const route = routeResult.rows[0]
  if (!route) {
    throw createHttpError(409, 'Visitor route is not available.')
  }

  const stopResult = await client.query(
    `SELECT stop.sequence_number AS "sequenceNumber",
            stop.node_id::text AS "nodeId",
            stop.exhibit_id::text AS "exhibitId",
            stop.stop_type AS "stopType",
            stop.walking_seconds AS "walkingSeconds",
            stop.visit_minutes AS "visitMinutes",
            stop.status,
            stop.arrival_time AS "arrivalTime",
            stop.completion_time AS "completionTime",
            stop.path_node_ids AS "pathNodeIds",
            node.x_coordinate AS "xCoordinate",
            node.y_coordinate AS "yCoordinate",
            exhibit.name,
            exhibit.short_code AS "shortCode"
     FROM public.route_stops AS stop
     JOIN public.map_nodes AS node ON node.id = stop.node_id
     LEFT JOIN public.exhibits AS exhibit ON exhibit.id = stop.exhibit_id
     WHERE stop.route_id = $1
     ORDER BY stop.sequence_number`,
    [route.id],
  )
  return { ...route, stops: stopResult.rows }
}

async function getVisitorView(client, sessionId) {
  const session = await getSessionRow(client, sessionId)
  const interestsResult = await client.query(
    `SELECT category.id::text AS id, category.name
     FROM public.visitor_session_interests AS interest
     JOIN public.categories AS category ON category.id = interest.category_id
     WHERE interest.session_id = $1
     ORDER BY category.name`,
    [sessionId],
  )
  const route = await getLatestRoute(client, sessionId)
  return {
    session: {
      id: session.id,
      status: session.status,
      allocatedMinutes: session.allocatedMinutes,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      remainingSeconds: calculateRemainingSeconds(session),
      interests: interestsResult.rows,
    },
    route,
  }
}

function validateSessionRequest(input) {
  validateObject(input, ['interests', 'availableMinutes'])
  if (!Array.isArray(input.interests) || input.interests.length === 0) {
    throw createHttpError(400, 'Select at least one visitor interest.')
  }
  if (input.interests.length > 50) {
    throw createHttpError(400, 'Select no more than 50 visitor interests.')
  }
  const interests = [...new Set(input.interests.map((id) => validateId(id, 'interests')))]
  const availableMinutes = validatePositiveInteger(
    input.availableMinutes,
    'availableMinutes',
  )
  if (availableMinutes > 480) {
    throw createHttpError(400, 'availableMinutes must not exceed 480.')
  }
  return { interests, availableMinutes }
}

export async function createVisitorSession(museumId, workerUserId, input) {
  const request = validateSessionRequest(input)
  const routeToken = randomBytes(32).toString('base64url')
  const tokenHash = hashRouteToken(routeToken)

  const created = await withTransaction(async (client) => {
    const categoryResult = await client.query(
      `SELECT id::text AS id
       FROM public.categories
       WHERE museum_id = $1 AND id = ANY($2::bigint[])`,
      [museumId, request.interests],
    )
    if (categoryResult.rows.length !== request.interests.length) {
      throw createHttpError(
        400,
        'All selected interests must belong to your museum.',
      )
    }

    const floorplanResult = await client.query(
      `SELECT id::text AS id
       FROM public.floorplans
       WHERE museum_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [museumId],
    )
    const floorplanId = floorplanResult.rows[0]?.id
    if (!floorplanId) {
      throw createHttpError(409, 'Create a floorplan before starting a tour.')
    }
    const graphData = await loadFloorplanGraph(client, museumId, floorplanId)

    const sessionResult = await client.query(
      `INSERT INTO public.visitor_sessions (
         museum_id, worker_user_id, floorplan_id, route_token_hash,
         allocated_minutes, current_node_id
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, museum_id::text AS "museumId",
                 worker_user_id::text AS "workerUserId",
                 floorplan_id::text AS "floorplanId", status,
                 allocated_minutes AS "allocatedMinutes",
                 started_at AS "startedAt", completed_at AS "completedAt",
                 current_node_id::text AS "currentNodeId",
                 route_version AS "routeVersion",
                 created_at AS "createdAt"`,
      [
        museumId,
        workerUserId,
        floorplanId,
        tokenHash,
        request.availableMinutes,
        graphData.entranceNodeId,
      ],
    )
    const session = sessionResult.rows[0]
    for (const categoryId of request.interests) {
      await client.query(
        `INSERT INTO public.visitor_session_interests (session_id, category_id)
         VALUES ($1, $2)`,
        [session.id, categoryId],
      )
    }

    const route = await createRouteRevision(client, session, {
      reason: 'initial',
      currentNodeId: graphData.entranceNodeId,
      remainingSeconds: request.availableMinutes * 60,
    })
    const view = await getVisitorView(client, session.id)
    return { ...view, route, routeToken }
  })

  return created
}

export async function listWorkerSessions(workerUserId) {
  const result = await databasePool.query(
    `SELECT id, status, allocated_minutes AS "allocatedMinutes",
            created_at AS "createdAt", started_at AS "startedAt",
            completed_at AS "completedAt"
     FROM public.visitor_sessions
     WHERE worker_user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [workerUserId],
  )
  return result.rows
}

export async function findVisitorSessionByToken(token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
    throw createHttpError(401, 'A valid visitor route token is required.')
  }
  const result = await databasePool.query(
    `SELECT id, museum_id::text AS "museumId", status
     FROM public.visitor_sessions
     WHERE route_token_hash = $1`,
    [hashRouteToken(token)],
  )
  const session = result.rows[0]
  if (!session || session.status === 'expired') {
    throw createHttpError(401, 'This visitor route token is no longer active.')
  }
  return session
}

export async function startVisitorSession(token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
    throw createHttpError(401, 'A valid visitor route token is required.')
  }

  const sessionId = await withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, status
       FROM public.visitor_sessions
       WHERE route_token_hash = $1
       FOR UPDATE`,
      [hashRouteToken(token)],
    )
    const session = result.rows[0]
    if (!session || ['completed', 'expired'].includes(session.status)) {
      throw createHttpError(401, 'This visitor route token is no longer active.')
    }
    if (session.status === 'ready') {
      await client.query(
        `UPDATE public.visitor_sessions
         SET status = 'active', started_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [session.id],
      )
      await client.query(
        `INSERT INTO public.visitor_events (session_id, event_type)
         VALUES ($1, 'TOUR_STARTED')`,
        [session.id],
      )
    }
    return session.id
  })

  return databasePool.connect().then(async (client) => {
    try {
      return await getVisitorView(client, sessionId)
    } finally {
      client.release()
    }
  })
}

export async function getVisitorSession(sessionId) {
  const client = await databasePool.connect()
  try {
    return await getVisitorView(client, sessionId)
  } finally {
    client.release()
  }
}

export async function getVisitorMap(sessionId) {
  const client = await databasePool.connect()
  try {
    const session = await getSessionRow(client, sessionId)
    const floorplanResult = await client.query(
      `SELECT id::text AS id, name, floor_label AS "floorLabel",
              svg_asset_path AS "svgAssetPath",
              svg_viewbox_width AS "viewBoxWidth",
              svg_viewbox_height AS "viewBoxHeight"
       FROM public.floorplans
       WHERE id = $1`,
      [session.floorplanId],
    )
    const nodeResult = await client.query(
      `SELECT id::text AS id, exhibit_id::text AS "exhibitId",
              node_type AS "nodeType", label,
              x_coordinate AS "xCoordinate", y_coordinate AS "yCoordinate"
       FROM public.map_nodes
       WHERE floorplan_id = $1
       ORDER BY id`,
      [session.floorplanId],
    )
    const pathResult = await client.query(
      `SELECT id::text AS id, from_node_id::text AS "fromNodeId",
              to_node_id::text AS "toNodeId",
              estimated_walking_seconds AS "estimatedWalkingSeconds",
              is_bidirectional AS "isBidirectional"
       FROM public.walking_paths
       WHERE floorplan_id = $1
       ORDER BY id`,
      [session.floorplanId],
    )
    const route = await getLatestRoute(client, sessionId)
    return {
      floorplan: floorplanResult.rows[0],
      nodes: nodeResult.rows,
      paths: pathResult.rows,
      route,
    }
  } finally {
    client.release()
  }
}

function validateShortCode(input) {
  validateObject(input, ['code'])
  const code = validateText(input.code, 'code')
  if (code.length > 64) {
    throw createHttpError(400, 'code is too long.')
  }
  return code.trim().toUpperCase()
}

async function assertActiveSession(client, sessionId) {
  const session = await getSessionRow(client, sessionId, { lock: true })
  if (session.status !== 'active') {
    throw createHttpError(409, 'The visitor tour is not active.')
  }
  return session
}

export async function scanExhibit(sessionId, input) {
  const code = validateShortCode(input)
  return withTransaction(async (client) => {
    const session = await assertActiveSession(client, sessionId)
    const expectedResult = await client.query(
      `SELECT stop.id::text AS "stopId",
              stop.exhibit_id::text AS "exhibitId",
              stop.node_id::text AS "nodeId", stop.status,
              exhibit.short_code AS "shortCode"
       FROM public.route_stops AS stop
       JOIN public.visitor_routes AS route ON route.id = stop.route_id
       JOIN public.exhibits AS exhibit ON exhibit.id = stop.exhibit_id
       WHERE route.session_id = $1
         AND route.version = $2
         AND stop.stop_type = 'exhibit'
         AND stop.status IN ('pending', 'arrived')
       ORDER BY stop.sequence_number
       LIMIT 1`,
      [sessionId, session.routeVersion],
    )
    const expected = expectedResult.rows[0]
    if (!expected || expected.shortCode.toUpperCase() !== code) {
      throw createHttpError(409, 'This exhibit is not the expected next stop.')
    }

    if (expected.status === 'pending') {
      await client.query(
        `UPDATE public.route_stops
         SET status = 'arrived', arrival_time = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [expected.stopId],
      )
      await client.query(
        `UPDATE public.visitor_sessions
         SET current_node_id = $1
         WHERE id = $2`,
        [expected.nodeId, sessionId],
      )
      await client.query(
        `INSERT INTO public.visitor_events (
           session_id, exhibit_id, event_type
         )
         VALUES ($1, $2, 'EXHIBIT_SCANNED')`,
        [sessionId, expected.exhibitId],
      )
    }

    const storyResult = await client.query(
      `SELECT id::text AS id, short_code AS "shortCode", name,
              description_en AS "descriptionEn",
              description_kn AS "descriptionKn",
              image_path AS "imageUrl",
              audio_en_path AS "audioEnUrl",
              audio_kn_path AS "audioKnUrl"
       FROM public.exhibits
       WHERE id = $1 AND museum_id = $2`,
      [expected.exhibitId, session.museumId],
    )
    return { exhibit: storyResult.rows[0] }
  })
}

function validateCompletion(input) {
  if (input === undefined) {
    return { skipped: false }
  }
  validateObject(input, ['skipped'])
  if (input.skipped !== undefined && typeof input.skipped !== 'boolean') {
    throw createHttpError(400, 'skipped must be a boolean.')
  }
  return { skipped: input.skipped ?? false }
}

export async function completeExhibit(sessionId, exhibitId, input) {
  const targetId = validateId(exhibitId, 'exhibitId')
  const completion = validateCompletion(input)
  return withTransaction(async (client) => {
    const session = await assertActiveSession(client, sessionId)
    const stopResult = await client.query(
      `SELECT stop.id::text AS id, stop.node_id::text AS "nodeId",
              stop.exhibit_id::text AS "exhibitId",
              stop.status, exhibit.name,
              stop.arrival_time AS "arrivalTime"
       FROM public.route_stops AS stop
       JOIN public.visitor_routes AS route ON route.id = stop.route_id
       JOIN public.exhibits AS exhibit ON exhibit.id = stop.exhibit_id
       WHERE route.session_id = $1
         AND route.version = $2
         AND stop.stop_type = 'exhibit'
         AND stop.status IN ('pending', 'arrived')
       ORDER BY stop.sequence_number
       LIMIT 1
       FOR UPDATE OF stop`,
      [sessionId, session.routeVersion],
    )
    const stop = stopResult.rows[0]
    if (!stop || targetId !== stop.exhibitId) {
      throw createHttpError(409, 'Only the current route stop can be completed or skipped.')
    }
    if (!completion.skipped && stop.status !== 'arrived') {
      throw createHttpError(409, 'Scan this exhibit before marking it complete.')
    }

    const nextStatus = completion.skipped ? 'skipped' : 'completed'
    const completionResult = await client.query(
      `UPDATE public.route_stops
       SET status = $1,
           completion_time = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING completion_time AS "completionTime"`,
      [nextStatus, stop.id],
    )
    await client.query(
      `UPDATE public.visitor_sessions
       SET current_node_id = $1
       WHERE id = $2`,
      [completion.skipped ? session.currentNodeId : stop.nodeId, sessionId],
    )
    await client.query(
      `INSERT INTO public.visitor_events (
         session_id, exhibit_id, event_type, metadata
       )
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        sessionId,
        targetId,
        completion.skipped ? 'EXHIBIT_SKIPPED' : 'EXHIBIT_COMPLETED',
        JSON.stringify({
          dwellSeconds:
            stop.status === 'arrived' && stop.arrivalTime
              ? Math.max(
                  0,
                  Math.floor(
                    (new Date(completionResult.rows[0].completionTime).getTime() -
                      new Date(stop.arrivalTime).getTime()) /
                      1000,
                  ),
                )
              : null,
        }),
      ],
    )

    const updatedSession = {
      ...session,
      currentNodeId: completion.skipped ? session.currentNodeId : stop.nodeId,
    }
    const route = await createRouteRevision(client, updatedSession, {
      reason: completion.skipped ? 'skipped' : 'completed',
      remainingSeconds: calculateRemainingSeconds(session),
    })
    return { route }
  })
}

export async function extendVisitorSession(sessionId, input) {
  validateObject(input, ['minutes'])
  const minutes = input.minutes
  if (![10, 20].includes(minutes)) {
    throw createHttpError(400, 'Session extensions must be 10 or 20 minutes.')
  }
  return withTransaction(async (client) => {
    const session = await assertActiveSession(client, sessionId)
    const updated = await client.query(
      `UPDATE public.visitor_sessions
       SET allocated_minutes = allocated_minutes + $1
       WHERE id = $2
       RETURNING allocated_minutes AS "allocatedMinutes"`,
      [minutes, sessionId],
    )
    await client.query(
      `INSERT INTO public.visitor_events (
         session_id, event_type, metadata
       )
       VALUES ($1, 'SESSION_EXTENDED', $2::jsonb)`,
      [sessionId, JSON.stringify({ minutes })],
    )
    const route = await createRouteRevision(
      client,
      { ...session, allocatedMinutes: updated.rows[0].allocatedMinutes },
      {
        reason: 'extended',
        remainingSeconds: calculateRemainingSeconds({
          ...session,
          allocatedMinutes: updated.rows[0].allocatedMinutes,
        }),
      },
    )
    return {
      allocatedMinutes: updated.rows[0].allocatedMinutes,
      route,
    }
  })
}

export async function finishVisitorSession(sessionId) {
  return withTransaction(async (client) => {
    await assertActiveSession(client, sessionId)
    const result = await client.query(
      `UPDATE public.visitor_sessions
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING completed_at AS "completedAt"`,
      [sessionId],
    )
    await client.query(
      `INSERT INTO public.visitor_events (session_id, event_type)
       VALUES ($1, 'TOUR_COMPLETED')`,
      [sessionId],
    )
    return result.rows[0]
  })
}

export async function submitVisitorFeedback(sessionId, exhibitId, input) {
  const targetId = validateId(exhibitId, 'exhibitId')
  validateObject(input, ['rating', 'comment'])
  const rating = input.rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, 'rating must be an integer from 1 to 5.')
  }
  let comment = input.comment
  if (comment !== undefined && comment !== null) {
    comment = validateText(comment, 'comment', { nullable: true })
    if (comment.length > 1000) {
      throw createHttpError(400, 'comment must not exceed 1000 characters.')
    }
  } else {
    comment = null
  }

  return withTransaction(async (client) => {
    const session = await getSessionRow(client, sessionId)
    if (session.status !== 'active' && session.status !== 'completed') {
      throw createHttpError(409, 'Feedback is available only during or after a tour.')
    }
    const completedResult = await client.query(
      `SELECT 1
       FROM public.route_stops AS stop
       JOIN public.visitor_routes AS route ON route.id = stop.route_id
       WHERE route.session_id = $1
         AND stop.exhibit_id = $2
         AND stop.status = 'completed'
       LIMIT 1`,
      [sessionId, targetId],
    )
    if (!completedResult.rows[0]) {
      throw createHttpError(409, 'Complete the exhibit before sending feedback.')
    }
    let result
    try {
      result = await client.query(
        `INSERT INTO public.visitor_feedback (
           session_id, exhibit_id, rating, comment
         )
         VALUES ($1, $2, $3, $4)
         RETURNING id::text AS id, rating, comment,
                   created_at AS "createdAt"`,
        [sessionId, targetId, rating, comment],
      )
    } catch (error) {
      if (error.code === '23505') {
        throw createHttpError(409, 'Feedback has already been submitted for this exhibit.')
      }
      throw error
    }
    await client.query(
      `INSERT INTO public.visitor_events (
         session_id, exhibit_id, event_type
       )
       VALUES ($1, $2, 'FEEDBACK_SUBMITTED')`,
      [sessionId, targetId],
    )
    return result.rows[0]
  })
}

const interactionEventTypes = new Set([
  'STORY_OPENED',
  'AUDIO_STARTED',
  'AUDIO_COMPLETED',
  'EXHIBIT_LIKED',
  'NOT_UNDERSTOOD',
  'LANGUAGE_SELECTED',
])

export async function recordVisitorInteraction(sessionId, input) {
  validateObject(input, ['eventType', 'exhibitId', 'language'])
  const eventType = validateText(input.eventType, 'eventType')
  if (!interactionEventTypes.has(eventType)) {
    throw createHttpError(400, 'eventType is not supported.')
  }
  const exhibitId =
    eventType === 'LANGUAGE_SELECTED'
      ? input.exhibitId === undefined
        ? null
        : validateId(input.exhibitId, 'exhibitId')
      : validateId(input.exhibitId, 'exhibitId')
  const language =
    input.language === undefined
      ? null
      : validateText(input.language, 'language')
  if (language !== null && !['en', 'kn'].includes(language)) {
    throw createHttpError(400, 'language must be en or kn.')
  }
  if (eventType === 'LANGUAGE_SELECTED' && language === null) {
    throw createHttpError(400, 'language is required for LANGUAGE_SELECTED.')
  }

  return withTransaction(async (client) => {
    const session = await assertActiveSession(client, sessionId)
    if (eventType !== 'LANGUAGE_SELECTED') {
      const visited = await client.query(
        `SELECT 1
         FROM public.route_stops AS stop
         JOIN public.visitor_routes AS route ON route.id = stop.route_id
         WHERE route.session_id = $1
           AND stop.exhibit_id = $2
           AND stop.status IN ('arrived', 'completed')
         LIMIT 1`,
        [sessionId, exhibitId],
      )
      if (!visited.rows[0]) {
        throw createHttpError(409, 'Scan the exhibit before recording this interaction.')
      }
    }
    await client.query(
      `INSERT INTO public.visitor_events (
         session_id, exhibit_id, event_type, language
       )
       VALUES ($1, $2, $3, $4)`,
      [sessionId, exhibitId, eventType, language],
    )
    return { recorded: true }
  })
}

export async function recalculateForUnavailableExhibit(museumId, exhibitId) {
  const sessions = await databasePool.query(
    `SELECT DISTINCT session.id, session.museum_id::text AS "museumId",
            session.floorplan_id::text AS "floorplanId",
            session.current_node_id::text AS "currentNodeId",
            session.allocated_minutes AS "allocatedMinutes",
            session.started_at AS "startedAt",
            session.route_version AS "routeVersion",
            session.status
     FROM public.visitor_sessions AS session
     JOIN public.visitor_routes AS route ON route.session_id = session.id
     JOIN public.route_stops AS stop ON stop.route_id = route.id
     WHERE session.museum_id = $1
       AND session.status = 'active'
       AND stop.exhibit_id = $2
       AND stop.status = 'pending'
       AND route.version = session.route_version`,
    [museumId, exhibitId],
  )
  for (const session of sessions.rows) {
    await withTransaction(async (client) => {
      const current = await getSessionRow(client, session.id, { lock: true })
      if (current.status !== 'active') {
        return
      }
      const stop = await client.query(
        `UPDATE public.route_stops AS stop
         SET status = 'skipped', completion_time = CURRENT_TIMESTAMP
         FROM public.visitor_routes AS route
         WHERE stop.route_id = route.id
           AND route.session_id = $1
           AND route.version = $2
           AND stop.exhibit_id = $3
           AND stop.status = 'pending'
         RETURNING stop.exhibit_id`,
        [current.id, current.routeVersion, exhibitId],
      )
      if (stop.rows[0]) {
        await client.query(
          `INSERT INTO public.visitor_events (
             session_id, exhibit_id, event_type, metadata
           )
           VALUES ($1, $2, 'EXHIBIT_SKIPPED', '{"reason":"unavailable"}'::jsonb)`,
          [current.id, exhibitId],
        )
        await createRouteRevision(client, current, {
          reason: 'unavailable',
          remainingSeconds: calculateRemainingSeconds(current),
        })
      }
    })
  }
}
