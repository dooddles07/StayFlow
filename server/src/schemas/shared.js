import { z } from 'zod'

// Accepts what every controller's local toFullDate() helper accepts: a bare
// "YYYY-MM-DD" (what <input type="date"> sends) or a full ISO datetime string.
export const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Must be a date string (YYYY-MM-DD or ISO datetime)')

// Whole numbers only, at least 1 — mirrors utils/validate.js's requirePositiveInt,
// as a type-check layer in front of it, not a replacement.
export const positiveInt = z.coerce.number().int().min(1)

export const nonEmptyString = z.string().trim().min(1)
