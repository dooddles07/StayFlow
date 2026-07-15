import type { Request, Response } from 'express'
import { z } from 'zod'
import * as ResidentModel from '../models/resident.model.js'
import { ApiError } from '../utils/ApiError.js'

const residentInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  unit: z.string().min(1),
  tier: z.enum(['Signature', 'Prestige', 'Elite']),
  moveInDate: z.string().optional(),
  dietary: z.array(z.string()).optional(),
  notifications: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  emergencyContact: z.object({ name: z.string(), relation: z.string(), phone: z.string() }).optional(),
})

export async function list(_req: Request, res: Response) {
  res.json(await ResidentModel.listResidents())
}

export async function getById(req: Request, res: Response) {
  const resident = await ResidentModel.getResidentById(req.params.id!)
  if (!resident) throw ApiError.notFound('Resident not found')
  res.json(resident)
}

export async function create(req: Request, res: Response) {
  const input = residentInputSchema.parse(req.body)
  res.status(201).json(await ResidentModel.createResident(input))
}

export async function update(req: Request, res: Response) {
  const id = req.params.id!
  const isSelf = req.auth?.residentId === id
  const isManagement = req.auth?.role === 'MANAGEMENT'
  if (!isSelf && !isManagement) throw ApiError.forbidden('You can only edit your own profile')

  const input = residentInputSchema.partial().parse(req.body)
  res.json(await ResidentModel.updateResident(id, input))
}

export async function remove(req: Request, res: Response) {
  await ResidentModel.deleteResident(req.params.id!)
  res.status(204).end()
}
