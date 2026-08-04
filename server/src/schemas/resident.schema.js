import { z } from 'zod'
import { dateInput, nonEmptyString } from './shared.js'

export const residentAdminCreateSchema = z.object({
  name: nonEmptyString,
  email: nonEmptyString,
  phone: nonEmptyString,
  unit: nonEmptyString,
  tier: z.enum(['SIGNATURE', 'PRESTIGE', 'ELITE']),
  avatarSeed: nonEmptyString,
  avatarStyle: z.string().optional(),
  moveInDate: dateInput,
  dietary: z.array(z.string()),
  notifications: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  emergencyName: nonEmptyString,
  emergencyRelation: nonEmptyString,
  emergencyPhone: nonEmptyString,
})

export const residentAdminUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  email: nonEmptyString.optional(),
  unit: nonEmptyString.optional(),
  tier: z.enum(['SIGNATURE', 'PRESTIGE', 'ELITE']).optional(),
})

// Matches SELF_EDITABLE_FIELDS in resident.controller.js. dietary's array-shape/
// dedup logic stays inline in the controller — this only checks it's an array.
export const residentSelfUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  phone: nonEmptyString.optional(),
  dietary: z.array(z.unknown()).optional(),
  notifications: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  emergencyName: nonEmptyString.optional(),
  emergencyRelation: nonEmptyString.optional(),
  emergencyPhone: nonEmptyString.optional(),
  emergency2Name: z.string().optional(),
  emergency2Relation: z.string().optional(),
  emergency2Phone: z.string().optional(),
  avatarSeed: nonEmptyString.optional(),
  avatarStyle: z.string().optional(),
})

// name/relation required non-empty (already enforced inline via requireString);
// age's 0-130 integer check also stays inline — this only checks presence/type.
export const familyMemberSchema = z.object({
  name: nonEmptyString,
  relation: nonEmptyString,
  age: z.union([z.number(), z.string()]),
})

export const vehicleSchema = z.object({
  make: nonEmptyString,
  model: nonEmptyString,
  plate: nonEmptyString,
  color: nonEmptyString,
})
