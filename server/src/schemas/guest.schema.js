import { z } from 'zod'
import { dateInput, nonEmptyString } from './shared.js'

export const guestCreateSchema = z.object({
  hostResidentId: nonEmptyString,
  name: nonEmptyString,
  purpose: nonEmptyString,
  vehiclePlate: z.string().optional(),
  arrivalDate: dateInput,
  arrivalTime: nonEmptyString,
})

// Superset of both MEMBER_EDITABLE and STAFF_EDITABLE (controller.js) — the
// role-based field restriction and status-transition table stay in the
// controller; this only type-checks whatever the caller actually sent.
export const guestUpdateSchema = z.object({
  hostResidentId: nonEmptyString.optional(),
  name: nonEmptyString.optional(),
  purpose: nonEmptyString.optional(),
  vehiclePlate: z.string().optional(),
  arrivalDate: dateInput.optional(),
  arrivalTime: nonEmptyString.optional(),
  status: z.enum(['PENDING', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT']).optional(),
})
