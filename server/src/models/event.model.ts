import { prisma } from '../lib/prisma.js'
import type { Prisma } from '@prisma/client'

const eventInclude = { rsvps: true } satisfies Prisma.EventInclude
type EventWithRsvps = Prisma.EventGetPayload<{ include: typeof eventInclude }>

export function toEventDTO(row: EventWithRsvps) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    image: row.image,
    date: row.date.toISOString().slice(0, 10),
    time: row.time,
    location: row.location,
    capacity: row.capacity,
    attendeeIds: row.rsvps.map((r) => r.residentId),
  }
}

export async function listEvents() {
  const rows = await prisma.event.findMany({ include: eventInclude, orderBy: { date: 'asc' } })
  return rows.map(toEventDTO)
}

export async function getEventById(id: string) {
  const row = await prisma.event.findUnique({ where: { id }, include: eventInclude })
  return row ? toEventDTO(row) : null
}

export interface EventInput {
  title: string
  category: string
  description: string
  image: string
  date: string
  time: string
  location: string
  capacity: number
}

export async function createEvent(input: EventInput) {
  const row = await prisma.event.create({ data: { ...input, date: new Date(input.date) }, include: eventInclude })
  return toEventDTO(row)
}

export async function updateEvent(id: string, input: Partial<EventInput>) {
  const row = await prisma.event.update({
    where: { id },
    data: { ...input, ...(input.date !== undefined && { date: new Date(input.date) }) },
    include: eventInclude,
  })
  return toEventDTO(row)
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } })
}

export async function toggleEventRsvp(eventId: string, residentId: string) {
  const existing = await prisma.eventRsvp.findUnique({
    where: { eventId_residentId: { eventId, residentId } },
  })

  if (existing) {
    await prisma.eventRsvp.delete({ where: { id: existing.id } })
  } else {
    await prisma.eventRsvp.create({ data: { eventId, residentId } })
  }

  const row = await prisma.event.findUniqueOrThrow({ where: { id: eventId }, include: eventInclude })
  return toEventDTO(row)
}
