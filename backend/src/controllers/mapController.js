import { unlink, readFile } from 'node:fs/promises'
import path from 'node:path'
import * as mapService from '../services/mapService.js'

export async function list(request, response) {
  const floorplans = await mapService.listFloorplans(request.user.museumId)
  response.status(200).json({ floorplans })
}

export async function getById(request, response) {
  const floorplan = await mapService.getFloorplan(
    request.user.museumId,
    request.params.id,
  )
  response.status(200).json({ floorplan })
}

export async function create(request, response) {
  const floorplan = await mapService.createFloorplan(
    request.user.museumId,
    request.body,
  )
  response.status(201).json({ floorplan })
}

export async function uploadSvg(request, response) {
  if (!request.file) {
    response.status(400).json({
      error: { message: 'Choose an SVG floorplan to upload.' },
    })
    return
  }

  const contents = await readFile(request.file.path, 'utf8')
  const rootTag = contents.match(/<svg\b[^>]*>/i)?.[0]
  const viewBox = rootTag?.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1]
  const values = viewBox?.trim().split(/[\s,]+/).map(Number)
  if (
    !rootTag ||
    !values ||
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value)) ||
    values[0] !== 0 ||
    values[1] !== 0 ||
    values[2] <= 0 ||
    values[3] <= 0
  ) {
    await unlink(request.file.path)
    const error = new Error(
      'The SVG must have a viewBox formatted as 0 0 width height with positive dimensions.',
    )
    error.statusCode = 400
    throw error
  }

  response.status(201).json({
    svgAssetPath: `/uploads/floorplans/${path.basename(request.file.filename)}`,
    viewBoxWidth: values[2],
    viewBoxHeight: values[3],
  })
}

export async function addNode(request, response) {
  const node = await mapService.createMapNode(
    request.user.museumId,
    request.params.floorplanId,
    request.body,
  )
  response.status(201).json({ node })
}

export async function updateNode(request, response) {
  const node = await mapService.updateMapNode(
    request.user.museumId,
    request.params.floorplanId,
    request.params.nodeId,
    request.body,
  )
  response.status(200).json({ node })
}

export async function removeNode(request, response) {
  await mapService.deleteMapNode(
    request.user.museumId,
    request.params.floorplanId,
    request.params.nodeId,
  )
  response.status(204).end()
}

export async function addPath(request, response) {
  const path = await mapService.createWalkingPath(
    request.user.museumId,
    request.params.floorplanId,
    request.body,
  )
  response.status(201).json({ path })
}

export async function updatePath(request, response) {
  const path = await mapService.updateWalkingPath(
    request.user.museumId,
    request.params.floorplanId,
    request.params.pathId,
    request.body,
  )
  response.status(200).json({ path })
}

export async function removePath(request, response) {
  await mapService.deleteWalkingPath(
    request.user.museumId,
    request.params.floorplanId,
    request.params.pathId,
  )
  response.status(204).end()
}
