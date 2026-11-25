import { databasePool } from '../config/database.js'
import { createHttpError } from '../utils/httpError.js'
import {
  validateBoolean,
  validateId,
  validateObject,
  validatePatchFields,
  validatePositiveInteger,
  validateText,
} from '../utils/contentValidation.js'
import { rethrowContentConflict } from '../utils/databaseConflict.js'

const exhibitFields = `
  id::text AS id,
  museum_id::text AS "museumId",
  gallery_id::text AS "galleryId",
  category_id::text AS "categoryId",
  name,
  description_en AS "descriptionEn",
  description_kn AS "descriptionKn",
  estimated_visit_minutes AS "estimatedVisitMinutes",
  is_available AS "isAvailable",
  short_code AS "shortCode",
  image_path AS "imageUrl",
  audio_en_path AS "audioEnUrl",
  audio_kn_path AS "audioKnUrl",
  created_at AS "createdAt"
`
const exhibitBodyFields = [
  'galleryId',
  'categoryId',
  'name',
  'descriptionEn',
  'descriptionKn',
  'estimatedVisitMinutes',
  'isAvailable',
]
const exhibitColumns = {
  galleryId: 'gallery_id',
  categoryId: 'category_id',
  name: 'name',
  descriptionEn: 'description_en',
  descriptionKn: 'description_kn',
  estimatedVisitMinutes: 'estimated_visit_minutes',
  isAvailable: 'is_available',
}

function validateExhibitInput(input, partial = false) {
  validateObject(input, exhibitBodyFields)
  const values = {
    galleryId:
      input.galleryId === undefined
        ? undefined
        : validateId(input.galleryId, 'galleryId'),
    categoryId:
      input.categoryId === undefined
        ? undefined
        : validateId(input.categoryId, 'categoryId'),
    name: validateText(input.name, 'name'),
    descriptionEn: validateText(input.descriptionEn, 'descriptionEn', {
      nullable: true,
    }),
    descriptionKn: validateText(input.descriptionKn, 'descriptionKn', {
      nullable: true,
    }),
    estimatedVisitMinutes:
      input.estimatedVisitMinutes === undefined
        ? undefined
        : validatePositiveInteger(
            input.estimatedVisitMinutes,
            'estimatedVisitMinutes',
          ),
    isAvailable:
      input.isAvailable === undefined
        ? undefined
        : validateBoolean(input.isAvailable, 'isAvailable'),
  }

  if (partial) {
    validatePatchFields(input, exhibitBodyFields)
  } else {
    for (const field of [
      'galleryId',
      'categoryId',
      'name',
      'estimatedVisitMinutes',
    ]) {
      if (values[field] === undefined) {
        throw createHttpError(400, `${field} is required.`)
      }
    }
    values.descriptionEn ??= null
    values.descriptionKn ??= null
    values.isAvailable ??= true
  }

  return values
}

async function validateExhibitRelations(museumId, galleryId, categoryId) {
  const result = await databasePool.query(
    `SELECT
       EXISTS (
         SELECT 1 FROM public.galleries
         WHERE id = $1 AND museum_id = $3
       ) AS gallery_exists,
       EXISTS (
         SELECT 1 FROM public.categories
         WHERE id = $2 AND museum_id = $3
       ) AS category_exists`,
    [galleryId, categoryId, museumId],
  )

  if (!result.rows[0].gallery_exists || !result.rows[0].category_exists) {
    throw createHttpError(
      400,
      'galleryId and categoryId must belong to your museum.',
    )
  }
}

export async function listExhibits(museumId) {
  const result = await databasePool.query(
    `SELECT ${exhibitFields}
     FROM public.exhibits
     WHERE museum_id = $1
     ORDER BY id`,
    [museumId],
  )
  return result.rows
}

export async function getExhibit(museumId, id) {
  const exhibitId = validateId(id, 'id')
  const result = await databasePool.query(
    `SELECT ${exhibitFields}
     FROM public.exhibits
     WHERE id = $1 AND museum_id = $2`,
    [exhibitId, museumId],
  )

  if (!result.rows[0]) {
    throw createHttpError(404, 'Exhibit not found.')
  }

  return result.rows[0]
}

export async function createExhibit(museumId, input) {
  const exhibit = validateExhibitInput(input)
  await validateExhibitRelations(
    museumId,
    exhibit.galleryId,
    exhibit.categoryId,
  )

  const client = await databasePool.connect()
  try {
    await client.query('BEGIN')
    try {
      const inserted = await client.query(
      `INSERT INTO public.exhibits (
         museum_id, gallery_id, category_id, name, description_en,
         description_kn, estimated_visit_minutes, is_available, short_code
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
               'TMP-' || gen_random_uuid()::text)
       RETURNING id`,
      [
        museumId,
        exhibit.galleryId,
        exhibit.categoryId,
        exhibit.name,
        exhibit.descriptionEn,
        exhibit.descriptionKn,
        exhibit.estimatedVisitMinutes,
        exhibit.isAvailable,
      ],
    )
      const result = await client.query(
        `UPDATE public.exhibits
         SET short_code = 'EX-' || id::text
         WHERE id = $1
         RETURNING ${exhibitFields}`,
        [inserted.rows[0].id],
      )
      await client.query('COMMIT')
      return result.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      rethrowContentConflict(error)
    }
  } catch (error) {
    if (error.code === '23505') {
      rethrowContentConflict(error)
    }
    throw error
  } finally {
    client.release()
  }
}

export async function updateExhibit(museumId, id, input) {
  const exhibitId = validateId(id, 'id')
  const exhibit = validateExhibitInput(input, true)
  const existingResult = await databasePool.query(
    `SELECT gallery_id::text AS "galleryId",
            category_id::text AS "categoryId"
     FROM public.exhibits
     WHERE id = $1 AND museum_id = $2`,
    [exhibitId, museumId],
  )
  const existing = existingResult.rows[0]

  if (!existing) {
    throw createHttpError(404, 'Exhibit not found.')
  }

  await validateExhibitRelations(
    museumId,
    exhibit.galleryId ?? existing.galleryId,
    exhibit.categoryId ?? existing.categoryId,
  )

  const assignments = []
  const values = []
  for (const field of exhibitBodyFields) {
    if (exhibit[field] !== undefined) {
      values.push(exhibit[field])
      assignments.push(`${exhibitColumns[field]} = $${values.length}`)
    }
  }

  values.push(exhibitId, museumId)
  try {
    const result = await databasePool.query(
      `UPDATE public.exhibits
       SET ${assignments.join(', ')}
       WHERE id = $${values.length - 1} AND museum_id = $${values.length}
       RETURNING ${exhibitFields}`,
      values,
    )
    if (!result.rows[0]) {
      throw createHttpError(404, 'Exhibit not found.')
    }
    return result.rows[0]
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function deleteExhibit(museumId, id) {
  const exhibitId = validateId(id, 'id')
  try {
    const result = await databasePool.query(
      'DELETE FROM public.exhibits WHERE id = $1 AND museum_id = $2 RETURNING id',
      [exhibitId, museumId],
    )
    if (!result.rows[0]) {
      throw createHttpError(404, 'Exhibit not found.')
    }
  } catch (error) {
    rethrowContentConflict(error)
  }
}

export async function updateExhibitMedia(museumId, id, media) {
  const exhibitId = validateId(id, 'id')
  const allowedFields = {
    imageUrl: ['imageUrl', 'image_path'],
    audioEnUrl: ['audioEnUrl', 'audio_en_path'],
    audioKnUrl: ['audioKnUrl', 'audio_kn_path'],
  }
  const entries = Object.entries(media).filter(([, value]) => value !== undefined)
  if (entries.length === 0) {
    throw createHttpError(400, 'Choose at least one media file to upload.')
  }

  const assignments = []
  const values = []
  for (const [field, value] of entries) {
    const [apiField, column] = allowedFields[field] ?? []
    if (!apiField || typeof value !== 'string' || !value.startsWith('/uploads/')) {
      throw createHttpError(400, 'Unsupported exhibit media file.')
    }
    values.push(value)
    assignments.push(`${column} = $${values.length}`)
  }
  values.push(exhibitId, museumId)
  const result = await databasePool.query(
    `UPDATE public.exhibits
     SET ${assignments.join(', ')}
     WHERE id = $${values.length - 1} AND museum_id = $${values.length}
     RETURNING ${exhibitFields}`,
    values,
  )
  if (!result.rows[0]) {
    throw createHttpError(404, 'Exhibit not found.')
  }
  return result.rows[0]
}
