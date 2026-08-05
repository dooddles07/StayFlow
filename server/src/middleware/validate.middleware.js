import { ApiError } from '../utils/ApiError.js'

// Runs before the controller: validates req.body's shape/types against a zod
// schema. Existing business-logic checks (capacity, status transitions, XOR
// rules, mass-assignment allowlists, etc.) stay in the controllers untouched —
// this only catches malformed input before it gets there.
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    throw ApiError.badRequest('Invalid request body', result.error.flatten())
  }
  req.body = result.data
  next()
}

// Same idea for query strings. Untyped query params were being passed straight
// into Prisma: ?limit=abc became take: NaN, which threw as an unmapped 500
// instead of a 400. Parsed values land on req.validatedQuery because Express 5
// makes req.query a getter, and reassigning it throws.
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query)
  if (!result.success) {
    throw ApiError.badRequest(
      'Invalid query parameters',
      result.error.flatten(),
    )
  }
  req.validatedQuery = result.data
  next()
}
