import { z } from 'zod'

// Accepts what every controller's local toFullDate() helper accepts: a bare
// "YYYY-MM-DD" (what <input type="date"> sends) or a full ISO datetime string.
export const dateInput = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T.*)?$/,
    'Must be a date string (YYYY-MM-DD or ISO datetime)',
  )

// Whole numbers only, at least 1 — mirrors utils/validate.js's requirePositiveInt,
// as a type-check layer in front of it, not a replacement.
export const positiveInt = z.coerce.number().int().min(1)

export const nonEmptyString = z.string().trim().min(1)

// Photos are rendered straight into an <img src>. Typed as a plain string these
// fields accepted "javascript:..." and any third-party host; the frontend CSP
// blocks both, but a stored value that only one layer stops is worth rejecting
// at the door. Two shapes are legitimate: the https URL an upload returns, and
// the site-relative path the seeded artwork uses. A leading "//" is rejected
// with everything else — it looks relative but points at another origin.
export const imageUrl = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    if (value.startsWith('/')) return !value.startsWith('//')
    try {
      return new URL(value).protocol === 'https:'
    } catch {
      return false
    }
  }, 'Must be an https link or a path on this site')
