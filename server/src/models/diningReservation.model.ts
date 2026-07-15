import { prisma } from '../lib/prisma.js'
import type { DiningReservationStatus } from '@prisma/client'

export function listDiningReservations(filter?: { residentId?: string; restaurantId?: string }) {
  return prisma.diningReservation.findMany({
    where: { residentId: filter?.residentId, restaurantId: filter?.restaurantId },
    orderBy: { date: 'asc' },
  })
}

export interface DiningReservationInput {
  restaurantId: string
  residentId: string
  date: string
  time: string
  partySize: number
  occasion?: string
  dietary?: string
  seating: string
}

export function createDiningReservation(input: DiningReservationInput) {
  return prisma.diningReservation.create({
    data: { ...input, date: new Date(input.date), status: 'PENDING' },
  })
}

export function updateDiningReservationStatus(id: string, status: DiningReservationStatus) {
  return prisma.diningReservation.update({ where: { id }, data: { status } })
}
