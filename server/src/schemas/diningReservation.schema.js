import { z } from 'zod'
import { dateInput, nonEmptyString, positiveInt } from './shared.js'

export const diningReservationCreateSchema = z.object({
  residentId: nonEmptyString,
  restaurantId: nonEmptyString,
  date: dateInput,
  time: nonEmptyString,
  partySize: positiveInt,
  occasion: z.string().optional(),
  dietary: z.string().optional(),
  seating: nonEmptyString,
})

export const diningReservationUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED', 'ARRIVED']),
})
