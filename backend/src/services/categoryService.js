import { databasePool } from '../config/database.js'
import { createHttpError } from '../utils/httpError.js'
import {
  validateObject,
  validatePatchFields,
  validateText,
  validateId,
} from '../utils/contentValidation.js'
import { rethrowContentConflict } from '../utils/databaseConflict.js'

const categoryFields = `
  id::text AS id,
  museum_id::text AS "museumId",
  name,
  description,
  created_at AS "createdAt"
`
const categoryBodyFields = ['name', 'description']

function validateCategoryInput(input, partial = false) {
  validateObject(input, categoryBodyFields)
  const values = {
    name: validateText(input.name, 'name'),
    description:
      input.description === undefined && !partial
        ? null
        : validateText(input.description, 'description', { nullable: true }),
  }

  if (partial) {
    validatePatchFields(input, categoryBodyFields)
  } else if (values.name === undefined) {
    throw createHttpError(400, 'name is required.')
  }

  return values
}

export async function listCategories(museumId) {
  const result = await databasePool.query(
    `SELECT ${categoryFields}
     FROM public.categories
     WHERE museum_id = $1
     ORDER BY id`,
    [museumId],
  )
  return result.rows
}

export async function getCategory(museumId, id) {
  const categoryId = validateId(id, 'id')
  const result = await databasePool.query(
    `SELECT ${categoryFields}
     FROM public.categories
     WHERE id = $1 AND museum_id = $2`,
    [categoryId, museumId],
  )

  if (!result.rows[0]) {
    throw createHttpError(404, 'Category not found.')
  }

  return result.rows[0]
}

export async function createCategory(museumId, input) {
  const category = validateCategoryInput(input)
  try {
    const result = await databasePool.query(
      `INSERT INTO public.categories (museum_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING ${categoryFields}`,
      [museumId, category.name, category.description],
    )
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function updateCategory(museumId, id, input) {
  const categoryId = validateId(id, 'id')
  const category = validateCategoryInput(input, true)
  const assignments = []
  const values = []

  for (const field of categoryBodyFields) {
    if (category[field] !== undefined) {
      values.push(category[field])
      assignments.push(`${field} = $${values.length}`)
    }
  }

  values.push(categoryId, museumId)
  try {
    const result = await databasePool.query(
      `UPDATE public.categories
       SET ${assignments.join(', ')}
       WHERE id = $${values.length - 1} AND museum_id = $${values.length}
       RETURNING ${categoryFields}`,
      values,
    )
    if (!result.rows[0]) {
      throw createHttpError(404, 'Category not found.')
    }
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function deleteCategory(museumId, id) {
  const categoryId = validateId(id, 'id')
  try {
    const result = await databasePool.query(
      'DELETE FROM public.categories WHERE id = $1 AND museum_id = $2 RETURNING id',
      [categoryId, museumId],
    )
    if (!result.rows[0]) {
      throw createHttpError(404, 'Category not found.')
    }
  } catch (error) {
    rethrowContentConflict(error)
  }
}
