import { databasePool } from '../config/database.js'
import { createHttpError } from '../utils/httpError.js'
import {
  validateObject,
  validatePatchFields,
  validateText,
  validateId,
} from '../utils/contentValidation.js'
import { rethrowContentConflict } from '../utils/databaseConflict.js'

const galleryFields = `
  id::text AS id,
  museum_id::text AS "museumId",
  name,
  description,
  created_at AS "createdAt"
`
const galleryBodyFields = ['name', 'description']

function validateGalleryInput(input, partial = false) {
  validateObject(input, galleryBodyFields)
  const values = {
    name: validateText(input.name, 'name'),
    description:
      input.description === undefined && !partial
        ? null
        : validateText(input.description, 'description', { nullable: true }),
  }

  if (partial) {
    validatePatchFields(input, galleryBodyFields)
  } else if (values.name === undefined) {
    throw createHttpError(400, 'name is required.')
  }

  return values
}

export async function listGalleries(museumId) {
  const result = await databasePool.query(
    `SELECT ${galleryFields}
     FROM public.galleries
     WHERE museum_id = $1
     ORDER BY id`,
    [museumId],
  )
  return result.rows
}

export async function getGallery(museumId, id) {
  const galleryId = validateId(id, 'id')
  const result = await databasePool.query(
    `SELECT ${galleryFields}
     FROM public.galleries
     WHERE id = $1 AND museum_id = $2`,
    [galleryId, museumId],
  )

  if (!result.rows[0]) {
    throw createHttpError(404, 'Gallery not found.')
  }

  return result.rows[0]
}

export async function createGallery(museumId, input) {
  const gallery = validateGalleryInput(input)
  try {
    const result = await databasePool.query(
      `INSERT INTO public.galleries (museum_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING ${galleryFields}`,
      [museumId, gallery.name, gallery.description],
    )
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function updateGallery(museumId, id, input) {
  const galleryId = validateId(id, 'id')
  const gallery = validateGalleryInput(input, true)
  const assignments = []
  const values = []

  for (const field of galleryBodyFields) {
    if (gallery[field] !== undefined) {
      values.push(gallery[field])
      assignments.push(`${field} = $${values.length}`)
    }
  }

  values.push(galleryId, museumId)
  try {
    const result = await databasePool.query(
      `UPDATE public.galleries
       SET ${assignments.join(', ')}
       WHERE id = $${values.length - 1} AND museum_id = $${values.length}
       RETURNING ${galleryFields}`,
      values,
    )
    if (!result.rows[0]) {
      throw createHttpError(404, 'Gallery not found.')
    }
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function deleteGallery(museumId, id) {
  const galleryId = validateId(id, 'id')
  try {
    const result = await databasePool.query(
      'DELETE FROM public.galleries WHERE id = $1 AND museum_id = $2 RETURNING id',
      [galleryId, museumId],
    )
    if (!result.rows[0]) {
      throw createHttpError(404, 'Gallery not found.')
    }
  } catch (error) {
    rethrowContentConflict(error)
  }
}
