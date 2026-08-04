import { z } from 'zod'
import { dateInput, nonEmptyString, positiveInt } from './shared.js'

export const eventCreateSchema = z.object({
  title: nonEmptyString,
  category: nonEmptyString,
  description: nonEmptyString,
  image: nonEmptyString,
  date: dateInput,
  time: nonEmptyString,
  endTime: z.string().optional(),
  location: nonEmptyString,
  capacity: positiveInt,
})

export const eventUpdateSchema = eventCreateSchema.partial()

export const eventRsvpSchema = z.object({ residentId: nonEmptyString })
