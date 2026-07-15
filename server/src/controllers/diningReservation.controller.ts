import type { Request, Response } from 'express'
import { z } from 'zod'
import * as DiningModel from '../models/diningReservation.model.js'
import { ApiError } from '../utils/ApiError.js'
import { prisma } from '../lib/prisma.js'

const reservationInputSchema = z.object({
  restaurantId: z.string().min(1),
  residentId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  partySize: z.number().int().positive(),
  occasion: z.string().optional(),
  dietary: z.string().optional(),
  seating: z.enum(['Indoor', 'Outdoor', 'Private Room', 'Bar']),
})

const statusInputSchema = z.object({
  status: z.enum(['confirmed', 'pending', 'cancelled', 'arrived']),
})

export async function list(req: Request, res: Response) {
  const isMember = req.auth?.role === 'MEMBER'
  const residentId = isMember ? (req.auth?.residentId ?? undefined) : (req.query.residentId as string | undefined)
  const restaurantId = req.query.restaurantId as string | undefined
  res.json(await DiningModel.listDiningReservations({ residentId, restaurantId }))
}

export async function create(req: Request, res: Response) {
  const input = reservationInputSchema.parse(req.body)
  if (req.auth?.role === 'MEMBER' && req.auth.residentId !== input.residentId) {
    throw ApiError.forbidden('You can only reserve on your own behalf')
  }
  res.status(201).json(await DiningModel.createDiningReservation(input))
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = statusInputSchema.parse(req.body)
  const id = req.params.id!

  if (req.auth?.role === 'MEMBER') {
    const reservation = await prisma.diningReservation.findUnique({ where: { id } })
    if (!reservation || reservation.residentId !== req.auth.residentId) throw ApiError.forbidden()
    if (status !== 'cancelled') throw ApiError.forbidden('Members may only cancel reservations')
  }

  res.json(await DiningModel.updateDiningReservationStatus(id, status.toUpperCase() as 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'ARRIVED'))
}
