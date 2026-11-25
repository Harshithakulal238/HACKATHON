import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from '../services/categoryService.js'

export async function list(request, response) {
  const categories = await listCategories(request.user.museumId)
  response.status(200).json({ categories })
}

export async function getById(request, response) {
  const category = await getCategory(request.user.museumId, request.params.id)
  response.status(200).json({ category })
}

export async function create(request, response) {
  const category = await createCategory(request.user.museumId, request.body)
  response.status(201).json({ category })
}

export async function update(request, response) {
  const category = await updateCategory(
    request.user.museumId,
    request.params.id,
    request.body,
  )
  response.status(200).json({ category })
}

export async function remove(request, response) {
  await deleteCategory(request.user.museumId, request.params.id)
  response.status(204).send()
}
