import { z } from 'zod'
import { imageUrl, nonEmptyString, positiveInt } from './shared.js'

export const facilityCreateSchema = z.object({
  name: nonEmptyString,
  category: nonEmptyString,
  description: nonEmptyString,
  rules: z.array(z.string()),
  image: imageUrl,
  capacity: positiveInt,
  openHours: nonEmptyString,
  location: nonEmptyString,
  rating: z.number(),
  status: z.enum(['OPEN', 'MAINTENANCE', 'CLOSED']).optional(),
  statusReason: z.string().nullable().optional(),
})

// setFacilityStatus (frontend) PUTs only { status, statusReason } — update must
// accept any subset of the create shape.
export const facilityUpdateSchema = facilityCreateSchema.partial()
