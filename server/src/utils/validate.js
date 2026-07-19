import { ApiError } from './ApiError.js'

// Whole numbers only, at least 1 — a party can't be negative, zero, or fractional.
export function requirePositiveInt(value, field) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest(`${field} must be a whole number of at least 1.`)
  return n
}
