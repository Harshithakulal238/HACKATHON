import { databasePool } from '../config/database.js'
import { createHttpError } from '../utils/httpError.js'
import {
  validateObject,
  validatePatchFields,
  validateText,
} from '../utils/contentValidation.js'

const museumFields = `
  id::text AS id,
  name,
  description,
  created_at AS "createdAt"
`

export async function getMuseum(museumId) {
  const result = await databasePool.query(
    `SELECT ${museumFields}
     FROM public.museums
     WHERE id = $1`,
    [museumId],
  )

  if (!result.rows[0]) {
    throw createHttpError(404, 'Museum not found.')
  }

  return result.rows[0]
}

export async function updateMuseum(museumId, input) {
  validateObject(input, ['name', 'description'])
  const valuesByField = {
    name: validateText(input.name, 'name'),
    description: validateText(input.description, 'description', {
      nullable: true,
    }),
  }
  validatePatchFields(input, Object.keys(valuesByField))

  const assignments = []
  const values = []
  for (const [field, column] of [
    ['name', 'name'],
    ['description', 'description'],
  ]) {
    if (valuesByField[field] !== undefined) {
      values.push(valuesByField[field])
      assignments.push(`${column} = $${values.length}`)
    }
  }

  values.push(museumId)
  const result = await databasePool.query(
    `UPDATE public.museums
     SET ${assignments.join(', ')}
     WHERE id = $${values.length}
     RETURNING ${museumFields}`,
    values,
  )

  if (!result.rows[0]) {
    throw createHttpError(404, 'Museum not found.')
  }

  return result.rows[0]
}
