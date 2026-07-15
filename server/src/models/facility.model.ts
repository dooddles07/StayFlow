import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import type { FacilityStatus } from '@prisma/client'

export function listFacilities() {
  return prisma.facility.findMany({ orderBy: { name: 'asc' } })
}

export function getFacilityById(id: string) {
  return prisma.facility.findUnique({ where: { id } })
}

export interface FacilityInput {
  name: string
  category: string
  description: string
  rules?: string[]
  image: string
  capacity: number
  openHours: string
  location: string
  rating?: number
}

export function createFacility(input: FacilityInput) {
  return prisma.facility.create({ data: { ...input, id: randomUUID(), rules: input.rules ?? [], rating: input.rating ?? 4.5 } })
}

export function updateFacility(id: string, input: Partial<FacilityInput>) {
  return prisma.facility.update({ where: { id }, data: input })
}

export function updateFacilityStatus(id: string, status: FacilityStatus, statusReason?: string) {
  return prisma.facility.update({ where: { id }, data: { status, statusReason: status === 'OPEN' ? null : statusReason } })
}

export function deleteFacility(id: string) {
  return prisma.facility.delete({ where: { id } })
}
