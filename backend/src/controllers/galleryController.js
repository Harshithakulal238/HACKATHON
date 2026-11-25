import {
  createGallery,
  deleteGallery,
  getGallery,
  listGalleries,
  updateGallery,
} from '../services/galleryService.js'

export async function list(request, response) {
  const galleries = await listGalleries(request.user.museumId)
  response.status(200).json({ galleries })
}

export async function getById(request, response) {
  const gallery = await getGallery(request.user.museumId, request.params.id)
  response.status(200).json({ gallery })
}

export async function create(request, response) {
  const gallery = await createGallery(request.user.museumId, request.body)
  response.status(201).json({ gallery })
}

export async function update(request, response) {
  const gallery = await updateGallery(
    request.user.museumId,
    request.params.id,
    request.body,
  )
  response.status(200).json({ gallery })
}

export async function remove(request, response) {
  await deleteGallery(request.user.museumId, request.params.id)
  response.status(204).send()
}
