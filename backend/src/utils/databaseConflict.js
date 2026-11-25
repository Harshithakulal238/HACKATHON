import { createHttpError } from './httpError.js'

export function rethrowContentConflict(error) {
  if (error.code === '23505') {
    throw createHttpError(
      409,
      'A resource with that name already exists in this museum.',
    )
  }
  if (error.code === '23503') {
    throw createHttpError(
      409,
      'This change conflicts with related museum data.',
    )
  }

  throw error
}
