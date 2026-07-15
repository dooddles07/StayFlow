import type { Request, Response } from 'express'
import { z } from 'zod'
import * as BookingModel from '../models/booking.model.js'
import { ApiError } from '../utils/ApiError.js'

const bookingInputSchema = z.object({
  facilityId: z.string().min(1),
  residentId: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  partySize: z.number().int().positive(),
  notes: z.string().optional(),
})

const statusInputSchema = z.object({
  status: z.enum(['confirmed', 'pending', 'cancelled']),
})

export async function list(req: Request, res: Response) {
  const isMember = req.auth?.role === 'MEMBER'
  const residentId = isMember ? (req.auth?.residentId ?? undefined) : (req.query.residentId as string | undefined)
  const facilityId = req.query.facilityId as string | undefined
  res.json(await BookingModel.listBookings({ residentId, facilityId }))
}

export async function create(req: Request, res: Response) {
  const input = bookingInputSchema.parse(req.body)

  if (req.auth?.role === 'MEMBER' && req.auth.residentId !== input.residentId) {
    throw ApiError.forbidden('You can only book on your own behalf')
  }

  if (await BookingModel.isSlotTaken(input.facilityId, input.date, input.timeSlot)) {
    throw ApiError.conflict('This time slot is no longer available')
  }

  res.status(201).json(await BookingModel.createBooking(input))
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = statusInputSchema.parse(req.body)
  const id = req.params.id!

  if (req.auth?.role === 'MEMBER') {
    const booking = await BookingModel.getBookingById(id)
    if (!booking || booking.residentId !== req.auth.residentId) throw ApiError.forbidden()
    if (status !== 'cancelled') throw ApiError.forbidden('Members may only cancel bookings')
  }

  res.json(await BookingModel.updateBookingStatus(id, status.toUpperCase() as 'CONFIRMED' | 'PENDING' | 'CANCELLED'))
}
