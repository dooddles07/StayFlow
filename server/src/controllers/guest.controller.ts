import type { Request, Response } from 'express'
import { z } from 'zod'
import * as GuestModel from '../models/guest.model.js'
import { ApiError } from '../utils/ApiError.js'

const guestInputSchema = z.object({
  name: z.string().min(1),
  hostResidentId: z.string().min(1),
  purpose: z.string().min(1),
  vehiclePlate: z.string().optional(),
  arrivalDate: z.string().min(1),
  arrivalTime: z.string().min(1),
})

const statusInputSchema = z.object({
  status: z.enum(['pending', 'approved', 'checked-in', 'checked-out']),
})

function toDbStatus(status: string) {
  return status.toUpperCase().replace('-', '_') as 'PENDING' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT'
}

export async function list(req: Request, res: Response) {
  const isMember = req.auth?.role === 'MEMBER'
  const hostResidentId = isMember ? (req.auth?.residentId ?? undefined) : (req.query.hostResidentId as string | undefined)
  res.json(await GuestModel.listGuests(hostResidentId))
}

export async function create(req: Request, res: Response) {
  const input = guestInputSchema.parse(req.body)
  if (req.auth?.role === 'MEMBER' && req.auth.residentId !== input.hostResidentId) {
    throw ApiError.forbidden('You can only register guests under your own unit')
  }
  res.status(201).json(await GuestModel.createGuest(input))
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = statusInputSchema.parse(req.body)
  if (req.auth?.role === 'MEMBER') throw ApiError.forbidden('Only staff can update guest status')
  res.json(await GuestModel.updateGuestStatus(req.params.id!, toDbStatus(status)))
}

export async function lookupByPass(req: Request, res: Response) {
  const guest = await GuestModel.findGuestByPassNumber(req.params.passNumber!)
  if (!guest) throw ApiError.notFound('Pass number not found')
  res.json(guest)
}
