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
