import { prisma } from '../lib/prisma.js'
import type { GuestStatus } from '@prisma/client'

export function listGuests(hostResidentId?: string) {
  return prisma.guest.findMany({ where: { hostResidentId }, orderBy: { arrivalDate: 'desc' } })
}

export interface GuestInput {
  name: string
  hostResidentId: string
  purpose: string
  vehiclePlate?: string
  arrivalDate: string
  arrivalTime: string
}

function generatePassNumber() {
  return `SF-GP-${Math.floor(10000 + Math.random() * 89999)}`
}

export function createGuest(input: GuestInput) {
  return prisma.guest.create({
    data: {
      name: input.name,
      hostResidentId: input.hostResidentId,
      purpose: input.purpose,
      vehiclePlate: input.vehiclePlate,
      arrivalDate: new Date(input.arrivalDate),
      arrivalTime: input.arrivalTime,
      passNumber: generatePassNumber(),
      status: 'PENDING',
    },
  })
}

export function updateGuestStatus(id: string, status: GuestStatus) {
  const now = new Date()
  return prisma.guest.update({
    where: { id },
    data: {
      status,
      ...(status === 'CHECKED_IN' && { checkedInAt: now }),
      ...(status === 'CHECKED_OUT' && { checkedOutAt: now }),
    },
  })
}

export function findGuestByPassNumber(passNumber: string) {
  return prisma.guest.findUnique({ where: { passNumber } })
}
