import { z } from 'zod'
import { dateInput, imageUrl, nonEmptyString, positiveInt } from './shared.js'

export const eventCreateSchema = z.object({
  title: nonEmptyString,
  category: nonEmptyString,
  description: nonEmptyString,
  image: imageUrl,
  date: dateInput,
  time: nonEmptyString,
  // Nullable, not just optional: the column is `endTime String?` and the admin
  // form sends null to clear it. `.optional()` alone accepts undefined but not
  // null, so saving any event without an end time was rejected as a 400.
  endTime: z.string().nullable().optional(),
  location: nonEmptyString,
  capacity: positiveInt,
})

export const eventUpdateSchema = eventCreateSchema.partial()

export const eventRsvpSchema = z.object({ residentId: nonEmptyString })
