import {
  createExhibit,
  deleteExhibit,
  getExhibit,
  listExhibits,
  updateExhibit,
  updateExhibitMedia,
} from '../services/exhibitService.js'
import { recalculateForUnavailableExhibit } from '../services/visitorSessionService.js'

export async function list(request, response) {
  const exhibits = await listExhibits(request.user.museumId)
  response.status(200).json({ exhibits })
}

export async function getById(request, response) {
  const exhibit = await getExhibit(request.user.museumId, request.params.id)
  response.status(200).json({ exhibit })
}

export async function create(request, response) {
  const exhibit = await createExhibit(request.user.museumId, request.body)
  response.status(201).json({ exhibit })
}

export async function update(request, response) {
  const exhibit = await updateExhibit(
    request.user.museumId,
    request.params.id,
    request.body,
  )
  if (request.body?.isAvailable === false) {
    await recalculateForUnavailableExhibit(
      request.user.museumId,
      request.params.id,
    )
  }
  response.status(200).json({ exhibit })
}

export async function updateMedia(request, response) {
  const uploaded = request.files ?? {}
  const media = {
    imageUrl: uploaded.image?.[0]
      ? `/uploads/exhibits/${uploaded.image[0].filename}`
      : undefined,
    audioEnUrl: uploaded.audioEn?.[0]
      ? `/uploads/audio/english/${uploaded.audioEn[0].filename}`
      : undefined,
    audioKnUrl: uploaded.audioKn?.[0]
      ? `/uploads/audio/kannada/${uploaded.audioKn[0].filename}`
      : undefined,
  }
  const exhibit = await updateExhibitMedia(
    request.user.museumId,
    request.params.id,
    media,
  )
  response.status(200).json({ exhibit })
}

export async function remove(request, response) {
  await deleteExhibit(request.user.museumId, request.params.id)
  response.status(204).send()
}
