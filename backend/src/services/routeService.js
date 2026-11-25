import { buildGraph } from '../algorithms/graphBuilder.js'
import { selectGreedyRoute } from '../algorithms/greedyRouteSelector.js'
import { createHttpError } from '../utils/httpError.js'

export async function loadFloorplanGraph(client, museumId, floorplanId) {
  const floorplanResult = await client.query(
    `SELECT id::text AS id, name, floor_label AS "floorLabel",
            svg_asset_path AS "svgAssetPath",
            svg_viewbox_width AS "viewBoxWidth",
            svg_viewbox_height AS "viewBoxHeight"
     FROM public.floorplans
     WHERE id = $1 AND museum_id = $2`,
    [floorplanId, museumId],
  )
  const nodeResult = await client.query(
    `SELECT id::text AS id, exhibit_id::text AS "exhibitId",
            node_type AS "nodeType", label,
            x_coordinate AS "xCoordinate", y_coordinate AS "yCoordinate"
     FROM public.map_nodes
     WHERE floorplan_id = $1 AND museum_id = $2
     ORDER BY id`,
    [floorplanId, museumId],
  )
  const pathResult = await client.query(
    `SELECT from_node_id::text AS "fromNodeId",
            to_node_id::text AS "toNodeId",
            estimated_walking_seconds AS "estimatedWalkingSeconds",
            is_bidirectional AS "isBidirectional"
     FROM public.walking_paths
     WHERE floorplan_id = $1
     ORDER BY id`,
    [floorplanId],
  )
  const floorplan = floorplanResult.rows[0]
  if (!floorplan) {
    throw createHttpError(404, 'Floorplan not found.')
  }

  const entrances = nodeResult.rows.filter((node) => node.nodeType === 'entrance')
  const exits = nodeResult.rows.filter((node) => node.nodeType === 'exit')
  if (entrances.length !== 1 || exits.length !== 1) {
    throw createHttpError(
      409,
      'The floorplan must have exactly one entrance and one exit before tours can be created.',
    )
  }

  return {
    floorplan,
    nodes: nodeResult.rows,
    graph: buildGraph(nodeResult.rows, pathResult.rows),
    entranceNodeId: entrances[0].id,
    exitNodeId: exits[0].id,
  }
}

export async function createRouteRevision(
  client,
  session,
  { reason, currentNodeId = session.currentNodeId, remainingSeconds },
) {
  const graphData = await loadFloorplanGraph(
    client,
    session.museumId,
    session.floorplanId,
  )
  const interestResult = await client.query(
    `SELECT category_id::text AS "categoryId"
     FROM public.visitor_session_interests
     WHERE session_id = $1
     ORDER BY category_id`,
    [session.id],
  )
  const previousResult = await client.query(
    `SELECT DISTINCT ON (stop.exhibit_id)
            stop.exhibit_id::text AS "exhibitId",
            stop.node_id::text AS "nodeId",
            exhibit.name,
            stop.visit_minutes AS "visitMinutes",
            stop.arrival_time AS "arrivalTime",
            stop.completion_time AS "completionTime",
            stop.status
     FROM public.route_stops AS stop
     JOIN public.visitor_routes AS route ON route.id = stop.route_id
     JOIN public.exhibits AS exhibit ON exhibit.id = stop.exhibit_id
     WHERE route.session_id = $1
       AND stop.exhibit_id IS NOT NULL
       AND stop.status IN ('completed', 'skipped')
     ORDER BY stop.exhibit_id, route.version DESC`,
    [session.id],
  )
  const completed = previousResult.rows.filter((stop) => stop.status === 'completed')
  completed.sort(
    (left, right) =>
      new Date(left.completionTime).getTime() -
      new Date(right.completionTime).getTime(),
  )
  const excluded = new Set(
    previousResult.rows.map((stop) => stop.exhibitId),
  )
  const candidateResult = await client.query(
    `SELECT exhibit.id::text AS id, exhibit.name,
            exhibit.category_id::text AS "categoryId",
            exhibit.estimated_visit_minutes AS "estimatedVisitMinutes",
            exhibit.is_available AS "isAvailable",
            node.id::text AS "nodeId"
     FROM public.exhibits AS exhibit
     JOIN public.map_nodes AS node
       ON node.exhibit_id = exhibit.id
      AND node.floorplan_id = $2
     WHERE exhibit.museum_id = $1
     ORDER BY exhibit.id`,
    [session.museumId, session.floorplanId],
  )
  const candidates = candidateResult.rows.filter(
    (candidate) => !excluded.has(candidate.id),
  )
  const route = selectGreedyRoute({
    graph: graphData.graph,
    startNodeId: currentNodeId,
    exitNodeId: graphData.exitNodeId,
    candidates,
    interestCategoryIds: interestResult.rows.map((row) => row.categoryId),
    availableSeconds: remainingSeconds,
  })

  if (!route.canReachExit) {
    throw createHttpError(409, 'No walking path from the current location to the exit exists.')
  }

  const nextVersion =
    reason === 'initial'
      ? 1
      : Number(session.routeVersion ?? 1) + 1
  const routeResult = await client.query(
    `INSERT INTO public.visitor_routes (session_id, version, reason)
     VALUES ($1, $2, $3)
     RETURNING id::text AS id, version, reason, created_at AS "createdAt"`,
    [session.id, nextVersion, reason],
  )
  const savedRoute = routeResult.rows[0]
  let sequence = 1

  for (const stop of completed) {
    await client.query(
      `INSERT INTO public.route_stops (
         route_id, session_id, sequence_number, floorplan_id, node_id,
         exhibit_id, stop_type, walking_seconds, visit_minutes, status,
         arrival_time, completion_time, path_node_ids
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'exhibit', 0, $7, 'completed', $8, $9, '[]'::jsonb)`,
      [
        savedRoute.id,
        session.id,
        sequence,
        session.floorplanId,
        stop.nodeId,
        stop.exhibitId,
        stop.visitMinutes,
        stop.arrivalTime,
        stop.completionTime,
      ],
    )
    sequence += 1
  }

  for (const stop of route.stops) {
    await client.query(
      `INSERT INTO public.route_stops (
         route_id, session_id, sequence_number, floorplan_id, node_id,
         exhibit_id, stop_type, walking_seconds, visit_minutes,
         path_node_ids
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'exhibit', $7, $8, $9::jsonb)`,
      [
        savedRoute.id,
        session.id,
        sequence,
        session.floorplanId,
        stop.nodeId,
        stop.exhibitId,
        stop.walkingSeconds,
        stop.visitMinutes,
        JSON.stringify(stop.pathNodeIds),
      ],
    )
    sequence += 1
  }

  await client.query(
    `INSERT INTO public.route_stops (
       route_id, session_id, sequence_number, floorplan_id, node_id,
       stop_type, walking_seconds, path_node_ids
     )
     VALUES ($1, $2, $3, $4, $5, 'exit', $6, $7::jsonb)`,
    [
      savedRoute.id,
      session.id,
      sequence,
      session.floorplanId,
      graphData.exitNodeId,
      route.exitWalkingSeconds,
      JSON.stringify(route.exitPath),
    ],
  )

  await client.query(
    `UPDATE public.visitor_sessions
     SET route_version = $1
     WHERE id = $2`,
    [nextVersion, session.id],
  )
  if (reason !== 'initial') {
    await client.query(
      `INSERT INTO public.visitor_events (session_id, event_type, metadata)
       VALUES ($1, 'ROUTE_UPDATED', $2::jsonb)`,
      [session.id, JSON.stringify({ reason, version: nextVersion })],
    )
  }

  return {
    ...savedRoute,
    stops: [
      ...completed.map((stop) => ({
        exhibitId: stop.exhibitId,
        nodeId: stop.nodeId,
        name: stop.name,
        visitMinutes: stop.visitMinutes,
        status: 'completed',
      })),
      ...route.stops.map((stop) => ({ ...stop, status: 'pending' })),
      {
        nodeId: graphData.exitNodeId,
        stopType: 'exit',
        walkingSeconds: route.exitWalkingSeconds,
        pathNodeIds: route.exitPath,
      },
    ],
    estimatedSeconds: route.estimatedSeconds,
    fitsBudget: route.fitsBudget,
  }
}
