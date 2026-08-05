import { ApiError } from './ApiError.js'

// Whole numbers only, at least 1 — a party can't be negative, zero, or fractional.
export function requirePositiveInt(value, field) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1)
    throw ApiError.badRequest(`${field} must be a whole number of at least 1.`)
  return n
}

// Prisma's @db.Date columns need a full ISO timestamp; the client sends a bare
// YYYY-MM-DD. Midnight UTC keeps the calendar day stable regardless of server
// timezone. Was copy-pasted verbatim into five controllers before this.
export function toFullDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00.000Z`
    : value
}

// Copies only the named fields out of a request body before it reaches Prisma —
// admin CRUD is gated to STAFF/MANAGEMENT, but nothing stops one of those roles
// (or a request that skips the client UI entirely) from sending fields the model
// was never meant to accept directly. Same pattern residentSelfController already
// uses for SELF_EDITABLE_FIELDS.
export function pickAllowed(body, fields) {
  const data = {}
  for (const field of fields) {
    if (field in body) data[field] = body[field]
  }
  return data
}
