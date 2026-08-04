import { z } from 'zod'
import { nonEmptyString } from './shared.js'

// StaffMember.role is a plain free-text string in the Prisma schema (e.g.
// "Facilities Manager"), NOT the PortalRole enum — do not z.enum() it.
export const staffCreateSchema = z.object({
  name: nonEmptyString,
  role: nonEmptyString,
  email: nonEmptyString,
  shift: nonEmptyString,
  avatarSeed: nonEmptyString,
})

// avatarSeed is deliberately excluded — updateStaffMember never touches it once set.
export const staffUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  role: nonEmptyString.optional(),
  email: nonEmptyString.optional(),
  shift: nonEmptyString.optional(),
})
