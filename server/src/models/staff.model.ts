import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'

export function listStaff() {
  return prisma.staffMember.findMany({ orderBy: { name: 'asc' } })
}

export function getStaffById(id: string) {
  return prisma.staffMember.findUnique({ where: { id } })
}

export interface StaffInput {
  name: string
  role: string
  email: string
  shift: string
}

export function createStaff(input: StaffInput) {
  return prisma.staffMember.create({ data: { ...input, id: randomUUID(), avatarSeed: input.name } })
}

export function updateStaff(id: string, input: Partial<StaffInput>) {
  return prisma.staffMember.update({
    where: { id },
    data: { ...input, ...(input.name !== undefined && { avatarSeed: input.name }) },
  })
}

export function deleteStaff(id: string) {
  return prisma.staffMember.delete({ where: { id } })
}
