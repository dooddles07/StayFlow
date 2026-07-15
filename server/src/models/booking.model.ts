import { prisma } from '../lib/prisma.js'
import type { BookingStatus } from '@prisma/client'

export function listBookings(filter?: { residentId?: string; facilityId?: string }) {
  return prisma.booking.findMany({
    where: { residentId: filter?.residentId, facilityId: filter?.facilityId },
    orderBy: { date: 'asc' },
  })
}

export function getBookingById(id: string) {
  return prisma.booking.findUnique({ where: { id } })
}

export interface BookingInput {
  facilityId: string
  residentId: string
  date: string
  timeSlot: string
  partySize: number
  notes?: string
}

export async function isSlotTaken(facilityId: string, date: string, timeSlot: string) {
  const existing = await prisma.booking.findFirst({
    where: { facilityId, date: new Date(date), timeSlot, status: { not: 'CANCELLED' } },
  })
  return !!existing
}

export function createBooking(input: BookingInput) {
  return prisma.booking.create({
    data: {
      facilityId: input.facilityId,
      residentId: input.residentId,
      date: new Date(input.date),
      timeSlot: input.timeSlot,
      partySize: input.partySize,
      notes: input.notes,
      status: 'PENDING',
    },
  })
}

export function updateBookingStatus(id: string, status: BookingStatus) {
  return prisma.booking.update({ where: { id }, data: { status } })
}
