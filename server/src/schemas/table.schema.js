import { z } from 'zod'
import { nonEmptyString, positiveInt } from './shared.js'

export const tableCreateSchema = z.object({
  restaurantId: nonEmptyString,
  label: nonEmptyString,
  seats: positiveInt,
  status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED']).optional(),
})

export const tableUpdateSchema = tableCreateSchema.partial()
