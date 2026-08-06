import { z } from 'zod'
import { dateInput, nonEmptyString, positiveInt } from './shared.js'

export const bookingCreateSchema = z.object({
  residentId: nonEmptyString,
  facilityId: nonEmptyString,
  date: dateInput,
  timeSlot: nonEmptyString,
  partySize: positiveInt,
  notes: z.string().nullable().optional(),
})

export const bookingUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED']),
})
