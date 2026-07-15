import type { Request, Response } from 'express'
import { z } from 'zod'
import * as StaffModel from '../models/staff.model.js'
import { ApiError } from '../utils/ApiError.js'

const staffInputSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['Concierge', 'Facilities Manager', 'Guest Relations', 'Dining Manager', 'Security', 'Operations']),
  email: z.string().email(),
  shift: z.enum(['Morning', 'Afternoon', 'Night']),
})

export async function list(_req: Request, res: Response) {
  res.json(await StaffModel.listStaff())
}

export async function getById(req: Request, res: Response) {
  const staff = await StaffModel.getStaffById(req.params.id!)
  if (!staff) throw ApiError.notFound('Staff member not found')
  res.json(staff)
}

export async function create(req: Request, res: Response) {
  const input = staffInputSchema.parse(req.body)
  res.status(201).json(await StaffModel.createStaff(input))
}

export async function update(req: Request, res: Response) {
  const input = staffInputSchema.partial().parse(req.body)
  res.json(await StaffModel.updateStaff(req.params.id!, input))
}

export async function remove(req: Request, res: Response) {
  await StaffModel.deleteStaff(req.params.id!)
  res.status(204).end()
}
