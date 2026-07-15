import type { Request, Response } from 'express'
import { z } from 'zod'
import * as EventModel from '../models/event.model.js'
import { ApiError } from '../utils/ApiError.js'

const eventInputSchema = z.object({
  title: z.string().min(1),
  category: z.enum(['Social', 'Wellness', 'Kids', 'Seasonal', 'Cultural']),
  description: z.string().min(1),
  image: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
  capacity: z.number().int().positive(),
})

export async function list(_req: Request, res: Response) {
  res.json(await EventModel.listEvents())
}

export async function getById(req: Request, res: Response) {
  const event = await EventModel.getEventById(req.params.id!)
  if (!event) throw ApiError.notFound('Event not found')
  res.json(event)
}

export async function create(req: Request, res: Response) {
  const input = eventInputSchema.parse(req.body)
  res.status(201).json(await EventModel.createEvent(input))
}

export async function update(req: Request, res: Response) {
  const input = eventInputSchema.partial().parse(req.body)
  res.json(await EventModel.updateEvent(req.params.id!, input))
}

export async function remove(req: Request, res: Response) {
  await EventModel.deleteEvent(req.params.id!)
  res.status(204).end()
}

export async function rsvp(req: Request, res: Response) {
  const residentId = req.auth?.residentId
  if (!residentId) throw ApiError.forbidden('Only members can RSVP')
  res.json(await EventModel.toggleEventRsvp(req.params.id!, residentId))
}
