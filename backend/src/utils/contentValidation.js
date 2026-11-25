import { createHttpError } from './httpError.js'

export function validateObject(input, allowedFields) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw createHttpError(400, 'A JSON object is required.')
  }

  const unknownFields = Object.keys(input).filter(
    (field) => !allowedFields.includes(field),
  )
  if (unknownFields.length > 0) {
    throw createHttpError(
      400,
      `Unsupported field: ${unknownFields[0]}.`,
    )
  }

  return input
}

export function validateText(value, field, { nullable = false } = {}) {
  if (value === undefined) {
    return undefined
  }
  if (value === null && nullable) {
    return null
  }
  if (typeof value !== 'string') {
    throw createHttpError(400, `${field} must be a string.`)
  }
  if (!nullable && !value.trim()) {
    throw createHttpError(400, `${field} cannot be empty.`)
  }

  return nullable ? value : value.trim()
}

export function validateId(value, field) {
  const id = typeof value === 'number' && Number.isSafeInteger(value)
    ? String(value)
    : value

  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
    throw createHttpError(400, `${field} must be a positive integer ID.`)
  }

  try {
    if (BigInt(id) > 9223372036854775807n) {
      throw createHttpError(400, `${field} is outside the supported range.`)
    }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    throw createHttpError(400, `${field} must be a positive integer ID.`)
  }

  return id
}

export function validatePositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw createHttpError(400, `${field} must be a positive integer.`)
  }

  return value
}

export function validateBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw createHttpError(400, `${field} must be a boolean.`)
  }

  return value
}

export function validatePatchFields(input, fields) {
  if (!fields.some((field) => input[field] !== undefined)) {
    throw createHttpError(400, 'Provide at least one field to update.')
  }
}
