import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import type { Prisma } from '@prisma/client'

const residentInclude = { family: true, vehicles: true } satisfies Prisma.ResidentInclude

type ResidentWithRelations = Prisma.ResidentGetPayload<{ include: typeof residentInclude }>

export function toResidentDTO(row: ResidentWithRelations) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    unit: row.unit,
    tier: row.tier.charAt(0) + row.tier.slice(1).toLowerCase(),
    avatarSeed: row.avatarSeed,
    moveInDate: row.moveInDate.toISOString().slice(0, 10),
    family: row.family.map((f) => ({ id: f.id, name: f.name, relation: f.relation, age: f.age })),
    vehicles: row.vehicles.map((v) => ({ id: v.id, make: v.make, model: v.model, plate: v.plate, color: v.color })),
    emergencyContact: { name: row.emergencyName, relation: row.emergencyRelation, phone: row.emergencyPhone },
    preferences: { dietary: row.dietary, notifications: row.notifications, newsletter: row.newsletter },
  }
}

export async function listResidents() {
  const rows = await prisma.resident.findMany({ include: residentInclude, orderBy: { name: 'asc' } })
  return rows.map(toResidentDTO)
}

export async function getResidentById(id: string) {
  const row = await prisma.resident.findUnique({ where: { id }, include: residentInclude })
  return row ? toResidentDTO(row) : null
}

export interface ResidentInput {
  name: string
  email: string
  phone: string
  unit: string
  tier: 'Signature' | 'Prestige' | 'Elite'
  moveInDate?: string
  dietary?: string[]
  notifications?: boolean
  newsletter?: boolean
  emergencyContact?: { name: string; relation: string; phone: string }
}

export async function createResident(input: ResidentInput) {
  const row = await prisma.resident.create({
    data: {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      unit: input.unit,
      tier: input.tier.toUpperCase() as Prisma.ResidentCreateInput['tier'],
      avatarSeed: input.name,
      moveInDate: input.moveInDate ? new Date(input.moveInDate) : new Date(),
      dietary: input.dietary ?? [],
      notifications: input.notifications ?? true,
      newsletter: input.newsletter ?? true,
      emergencyName: input.emergencyContact?.name ?? '',
      emergencyRelation: input.emergencyContact?.relation ?? '',
      emergencyPhone: input.emergencyContact?.phone ?? '',
    },
    include: residentInclude,
  })
  return toResidentDTO(row)
}

export async function updateResident(id: string, input: Partial<ResidentInput>) {
  const row = await prisma.resident.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name, avatarSeed: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.unit !== undefined && { unit: input.unit }),
      ...(input.tier !== undefined && { tier: input.tier.toUpperCase() as Prisma.ResidentUpdateInput['tier'] }),
      ...(input.dietary !== undefined && { dietary: input.dietary }),
      ...(input.notifications !== undefined && { notifications: input.notifications }),
      ...(input.newsletter !== undefined && { newsletter: input.newsletter }),
      ...(input.emergencyContact !== undefined && {
        emergencyName: input.emergencyContact.name,
        emergencyRelation: input.emergencyContact.relation,
        emergencyPhone: input.emergencyContact.phone,
      }),
    },
    include: residentInclude,
  })
  return toResidentDTO(row)
}

export async function deleteResident(id: string) {
  await prisma.resident.delete({ where: { id } })
}
