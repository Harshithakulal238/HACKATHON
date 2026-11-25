import { databasePool } from '../config/database.js'
import { createHttpError } from '../utils/httpError.js'
import {
  validateId,
  validateObject,
  validatePatchFields,
  validatePositiveInteger,
  validateText,
} from '../utils/contentValidation.js'
import { rethrowContentConflict } from '../utils/databaseConflict.js'

const floorplanFields = [
  'name',
  'floorLabel',
  'svgAssetPath',
  'viewBoxWidth',
  'viewBoxHeight',
]
const nodeFields = [
  'nodeType',
  'exhibitId',
  'label',
  'xCoordinate',
  'yCoordinate',
]
const pathFields = [
  'fromNodeId',
  'toNodeId',
  'estimatedWalkingSeconds',
  'isBidirectional',
]

function validateCoordinate(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw createHttpError(400, `${field} must be a non-negative number.`)
  }
  return value
}

function validateFloorplan(input) {
  validateObject(input, floorplanFields)
  const floorplan = {
    name: validateText(input.name, 'name'),
    floorLabel: validateText(input.floorLabel, 'floorLabel', { nullable: true }),
    svgAssetPath: validateText(input.svgAssetPath, 'svgAssetPath'),
    viewBoxWidth: validateCoordinate(input.viewBoxWidth, 'viewBoxWidth'),
    viewBoxHeight: validateCoordinate(input.viewBoxHeight, 'viewBoxHeight'),
  }
  if (
    !floorplan.svgAssetPath.startsWith('/uploads/floorplans/') ||
    floorplan.viewBoxWidth <= 0 ||
    floorplan.viewBoxHeight <= 0
  ) {
    throw createHttpError(400, 'Provide a valid uploaded SVG and viewBox size.')
  }
  floorplan.floorLabel ??= null
  return floorplan
}

function validateNode(input, partial = false) {
  validateObject(input, nodeFields)
  const node = {
    nodeType:
      input.nodeType === undefined
        ? undefined
        : validateText(input.nodeType, 'nodeType'),
    exhibitId:
      input.exhibitId === undefined
        ? undefined
        : input.exhibitId === null
          ? null
          : validateId(input.exhibitId, 'exhibitId'),
    label: validateText(input.label, 'label', { nullable: true }),
    xCoordinate:
      input.xCoordinate === undefined
        ? undefined
        : validateCoordinate(input.xCoordinate, 'xCoordinate'),
    yCoordinate:
      input.yCoordinate === undefined
        ? undefined
        : validateCoordinate(input.yCoordinate, 'yCoordinate'),
  }

  if (node.nodeType !== undefined) {
    if (!['entrance', 'exit', 'exhibit', 'waypoint'].includes(node.nodeType)) {
      throw createHttpError(400, 'nodeType is not supported.')
    }
    if (
      (node.nodeType === 'exhibit' && !node.exhibitId) ||
      (node.nodeType !== 'exhibit' && node.exhibitId)
    ) {
      throw createHttpError(400, 'exhibitId must match the selected nodeType.')
    }
  }
  if (partial) {
    validatePatchFields(input, nodeFields)
  } else if (
    node.nodeType === undefined ||
    node.xCoordinate === undefined ||
    node.yCoordinate === undefined
  ) {
    throw createHttpError(400, 'nodeType, xCoordinate, and yCoordinate are required.')
  }
  if (!partial) {
    node.label ??= null
  }
  return node
}

function validatePath(input, partial = false) {
  validateObject(input, pathFields)
  const path = {
    fromNodeId:
      input.fromNodeId === undefined
        ? undefined
        : validateId(input.fromNodeId, 'fromNodeId'),
    toNodeId:
      input.toNodeId === undefined
        ? undefined
        : validateId(input.toNodeId, 'toNodeId'),
    estimatedWalkingSeconds:
      input.estimatedWalkingSeconds === undefined
        ? undefined
        : validatePositiveInteger(
            input.estimatedWalkingSeconds,
            'estimatedWalkingSeconds',
          ),
    isBidirectional:
      input.isBidirectional === undefined
        ? undefined
        : input.isBidirectional,
  }

  if (
    path.isBidirectional !== undefined &&
    typeof path.isBidirectional !== 'boolean'
  ) {
    throw createHttpError(400, 'isBidirectional must be a boolean.')
  }
  if (partial) {
    validatePatchFields(input, pathFields)
  } else if (
    path.fromNodeId === undefined ||
    path.toNodeId === undefined ||
    path.estimatedWalkingSeconds === undefined
  ) {
    throw createHttpError(
      400,
      'fromNodeId, toNodeId, and estimatedWalkingSeconds are required.',
    )
  }
  if (!partial) {
    path.isBidirectional ??= true
  }
  if (
    path.fromNodeId !== undefined &&
    path.toNodeId !== undefined &&
    path.fromNodeId === path.toNodeId
  ) {
    throw createHttpError(400, 'A walking path must connect different nodes.')
  }
  return path
}

async function assertFloorplan(museumId, floorplanId) {
  const result = await databasePool.query(
    `SELECT id::text AS id, svg_viewbox_width AS "viewBoxWidth",
            svg_viewbox_height AS "viewBoxHeight"
     FROM public.floorplans
     WHERE id = $1 AND museum_id = $2`,
    [floorplanId, museumId],
  )
  if (!result.rows[0]) {
    throw createHttpError(404, 'Floorplan not found.')
  }
  return result.rows[0]
}

export async function listFloorplans(museumId) {
  const result = await databasePool.query(
    `SELECT id::text AS id, name, floor_label AS "floorLabel",
            svg_asset_path AS "svgAssetPath",
            svg_viewbox_width AS "viewBoxWidth",
            svg_viewbox_height AS "viewBoxHeight"
     FROM public.floorplans
     WHERE museum_id = $1
     ORDER BY id`,
    [museumId],
  )
  return result.rows
}

export async function getFloorplan(museumId, id) {
  const floorplanId = validateId(id, 'id')
  const floorplan = await assertFloorplan(museumId, floorplanId)
  const [nodeResult, pathResult] = await Promise.all([
    databasePool.query(
      `SELECT id::text AS id, exhibit_id::text AS "exhibitId",
              node_type AS "nodeType", label,
              x_coordinate AS "xCoordinate", y_coordinate AS "yCoordinate"
       FROM public.map_nodes
       WHERE floorplan_id = $1
       ORDER BY id`,
      [floorplanId],
    ),
    databasePool.query(
      `SELECT id::text AS id, from_node_id::text AS "fromNodeId",
              to_node_id::text AS "toNodeId",
              estimated_walking_seconds AS "estimatedWalkingSeconds",
              is_bidirectional AS "isBidirectional"
       FROM public.walking_paths
       WHERE floorplan_id = $1
       ORDER BY id`,
      [floorplanId],
    ),
  ])
  return {
    ...floorplan,
    nodes: nodeResult.rows,
    paths: pathResult.rows,
  }
}

export async function createFloorplan(museumId, input) {
  const floorplan = validateFloorplan(input)
  try {
    const result = await databasePool.query(
      `INSERT INTO public.floorplans (
         museum_id, name, floor_label, svg_asset_path,
         svg_viewbox_width, svg_viewbox_height
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id::text AS id, name, floor_label AS "floorLabel",
                 svg_asset_path AS "svgAssetPath",
                 svg_viewbox_width AS "viewBoxWidth",
                 svg_viewbox_height AS "viewBoxHeight"`,
      [
        museumId,
        floorplan.name,
        floorplan.floorLabel,
        floorplan.svgAssetPath,
        floorplan.viewBoxWidth,
        floorplan.viewBoxHeight,
      ],
    )
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function createMapNode(museumId, floorplanId, input) {
  const floorplan = await assertFloorplan(museumId, floorplanId)
  const node = validateNode(input)
  if (
    node.xCoordinate > Number(floorplan.viewBoxWidth) ||
    node.yCoordinate > Number(floorplan.viewBoxHeight)
  ) {
    throw createHttpError(400, 'Node coordinates must be inside the floorplan.')
  }
  if (node.exhibitId) {
    const exhibit = await databasePool.query(
      'SELECT 1 FROM public.exhibits WHERE id = $1 AND museum_id = $2',
      [node.exhibitId, museumId],
    )
    if (!exhibit.rows[0]) {
      throw createHttpError(400, 'exhibitId must belong to your museum.')
    }
  }

  try {
    const result = await databasePool.query(
      `INSERT INTO public.map_nodes (
         museum_id, floorplan_id, exhibit_id, node_type, label,
         x_coordinate, y_coordinate
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id::text AS id, exhibit_id::text AS "exhibitId",
                 node_type AS "nodeType", label,
                 x_coordinate AS "xCoordinate", y_coordinate AS "yCoordinate"`,
      [
        museumId,
        floorplanId,
        node.exhibitId,
        node.nodeType,
        node.label,
        node.xCoordinate,
        node.yCoordinate,
      ],
    )
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function updateMapNode(museumId, floorplanId, id, input) {
  const floorplan = await assertFloorplan(museumId, floorplanId)
  const nodeId = validateId(id, 'id')
  const node = validateNode(input, true)
  const existingResult = await databasePool.query(
    `SELECT exhibit_id::text AS "exhibitId", node_type AS "nodeType",
            x_coordinate AS "xCoordinate", y_coordinate AS "yCoordinate"
     FROM public.map_nodes
     WHERE id = $1 AND floorplan_id = $2 AND museum_id = $3`,
    [nodeId, floorplanId, museumId],
  )
  const existing = existingResult.rows[0]
  if (!existing) {
    throw createHttpError(404, 'Map node not found.')
  }
  const next = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(node).filter(([, value]) => value !== undefined),
    ),
  }
  if (
    next.xCoordinate > Number(floorplan.viewBoxWidth) ||
    next.yCoordinate > Number(floorplan.viewBoxHeight)
  ) {
    throw createHttpError(400, 'Node coordinates must be inside the floorplan.')
  }
  if (
    (next.nodeType === 'exhibit' && !next.exhibitId) ||
    (next.nodeType !== 'exhibit' && next.exhibitId)
  ) {
    throw createHttpError(400, 'exhibitId must match the selected nodeType.')
  }
  if (next.exhibitId) {
    const exhibit = await databasePool.query(
      'SELECT 1 FROM public.exhibits WHERE id = $1 AND museum_id = $2',
      [next.exhibitId, museumId],
    )
    if (!exhibit.rows[0]) {
      throw createHttpError(400, 'exhibitId must belong to your museum.')
    }
  }

  try {
    const result = await databasePool.query(
      `UPDATE public.map_nodes
       SET exhibit_id = $1, node_type = $2, label = $3,
           x_coordinate = $4, y_coordinate = $5
       WHERE id = $6 AND floorplan_id = $7 AND museum_id = $8
       RETURNING id::text AS id, exhibit_id::text AS "exhibitId",
                 node_type AS "nodeType", label,
                 x_coordinate AS "xCoordinate", y_coordinate AS "yCoordinate"`,
      [
        next.exhibitId,
        next.nodeType,
        next.label,
        next.xCoordinate,
        next.yCoordinate,
        nodeId,
        floorplanId,
        museumId,
      ],
    )
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function deleteMapNode(museumId, floorplanId, id) {
  await assertFloorplan(museumId, floorplanId)
  const nodeId = validateId(id, 'id')
  try {
    const result = await databasePool.query(
      `DELETE FROM public.map_nodes
       WHERE id = $1 AND floorplan_id = $2 AND museum_id = $3
       RETURNING id`,
      [nodeId, floorplanId, museumId],
    )
    if (!result.rows[0]) {
      throw createHttpError(404, 'Map node not found.')
    }
  } catch (error) {
    rethrowContentConflict(error)
  }
}

async function assertPathNodes(floorplanId, fromNodeId, toNodeId) {
  const result = await databasePool.query(
    `SELECT COUNT(*)::integer AS count
     FROM public.map_nodes
     WHERE floorplan_id = $1 AND id = ANY($2::bigint[])`,
    [floorplanId, [fromNodeId, toNodeId]],
  )
  if (result.rows[0].count !== 2) {
    throw createHttpError(400, 'Both path nodes must belong to this floorplan.')
  }
}

export async function createWalkingPath(museumId, floorplanId, input) {
  await assertFloorplan(museumId, floorplanId)
  const path = validatePath(input)
  await assertPathNodes(floorplanId, path.fromNodeId, path.toNodeId)
  try {
    const result = await databasePool.query(
      `INSERT INTO public.walking_paths (
         floorplan_id, from_node_id, to_node_id,
         estimated_walking_seconds, is_bidirectional
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id::text AS id, from_node_id::text AS "fromNodeId",
                 to_node_id::text AS "toNodeId",
                 estimated_walking_seconds AS "estimatedWalkingSeconds",
                 is_bidirectional AS "isBidirectional"`,
      [
        floorplanId,
        path.fromNodeId,
        path.toNodeId,
        path.estimatedWalkingSeconds,
        path.isBidirectional,
      ],
    )
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function updateWalkingPath(museumId, floorplanId, id, input) {
  await assertFloorplan(museumId, floorplanId)
  const pathId = validateId(id, 'id')
  const path = validatePath(input, true)
  const existingResult = await databasePool.query(
    `SELECT from_node_id::text AS "fromNodeId",
            to_node_id::text AS "toNodeId",
            estimated_walking_seconds AS "estimatedWalkingSeconds",
            is_bidirectional AS "isBidirectional"
     FROM public.walking_paths
     WHERE id = $1 AND floorplan_id = $2`,
    [pathId, floorplanId],
  )
  const existing = existingResult.rows[0]
  if (!existing) {
    throw createHttpError(404, 'Walking path not found.')
  }
  const next = { ...existing, ...path }
  if (next.fromNodeId === next.toNodeId) {
    throw createHttpError(400, 'A walking path must connect different nodes.')
  }
  await assertPathNodes(floorplanId, next.fromNodeId, next.toNodeId)
  try {
    const result = await databasePool.query(
      `UPDATE public.walking_paths
       SET from_node_id = $1, to_node_id = $2,
           estimated_walking_seconds = $3, is_bidirectional = $4
       WHERE id = $5 AND floorplan_id = $6
       RETURNING id::text AS id, from_node_id::text AS "fromNodeId",
                 to_node_id::text AS "toNodeId",
                 estimated_walking_seconds AS "estimatedWalkingSeconds",
                 is_bidirectional AS "isBidirectional"`,
      [
        next.fromNodeId,
        next.toNodeId,
        next.estimatedWalkingSeconds,
        next.isBidirectional,
        pathId,
        floorplanId,
      ],
    )
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function deleteWalkingPath(museumId, floorplanId, id) {
  await assertFloorplan(museumId, floorplanId)
  const pathId = validateId(id, 'id')
  const result = await databasePool.query(
    'DELETE FROM public.walking_paths WHERE id = $1 AND floorplan_id = $2 RETURNING id',
    [pathId, floorplanId],
  )
  if (!result.rows[0]) {
    throw createHttpError(404, 'Walking path not found.')
  }
}
