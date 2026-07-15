import type { Request, Response } from 'express'
import { z } from 'zod'
import * as FacilityModel from '../models/facility.model.js'
import { ApiError } from '../utils/ApiError.js'

const facilityInputSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['Wellness', 'Recreation', 'Entertainment', 'Sports', 'Function']),
  description: z.string().min(1),
  rules: z.array(z.string()).optional(),
  image: z.string().min(1),
  capacity: z.number().int().positive(),
  openHours: z.string().min(1),
  location: z.string().min(1),
  rating: z.number().min(0).max(5).optional(),
})

const statusInputSchema = z.object({
  status: z.enum(['open', 'maintenance', 'closed']),
  reason: z.string().optional(),
})

function toDbStatus(status: string) {
  return status.toUpperCase() as 'OPEN' | 'MAINTENANCE' | 'CLOSED'
}

export async function list(_req: Request, res: Response) {
  res.json(await FacilityModel.listFacilities())
}

export async function getById(req: Request, res: Response) {
  const facility = await FacilityModel.getFacilityById(req.params.id!)
  if (!facility) throw ApiError.notFound('Facility not found')
  res.json(facility)
}

export async function create(req: Request, res: Response) {
  const input = facilityInputSchema.parse(req.body)
  res.status(201).json(await FacilityModel.createFacility(input))
}

export async function update(req: Request, res: Response) {
  const input = facilityInputSchema.partial().parse(req.body)
  res.json(await FacilityModel.updateFacility(req.params.id!, input))
}

export async function updateStatus(req: Request, res: Response) {
  const { status, reason } = statusInputSchema.parse(req.body)
  res.json(await FacilityModel.updateFacilityStatus(req.params.id!, toDbStatus(status), reason))
}

export async function remove(req: Request, res: Response) {
  await FacilityModel.deleteFacility(req.params.id!)
  res.status(204).end()
}
