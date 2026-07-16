import { api } from './client'
import type { EventCategory } from '#/lib/mock/types'

interface EventRsvpRow {
  id: string
  residentId: string
  createdAt: string
}

// Flat shape returned by the API (mirrors the Prisma CommunityEvent row + rsvps relation).
interface EventApiResponse {
  id: string
  title: string
  category: EventCategory
  description: string
  image: string
  date: string
  time: string
  location: string
  capacity: number
  rsvps: EventRsvpRow[]
}

// View model the UI consumes — same shape as the old mock CommunityEvent type.
export interface CommunityEventView {
  id: string
  title: string
  category: EventCategory
  description: string
  image: string
  date: string
  time: string
  location: string
  capacity: number
  attendeeIds: string[]
}

const toEvent = (e: EventApiResponse): CommunityEventView => ({
  id: e.id,
  title: e.title,
  category: e.category,
  description: e.description,
  image: e.image,
  date: e.date,
  time: e.time,
  location: e.location,
  capacity: e.capacity,
  // Defensive: an endpoint that forgets to include the rsvps relation shouldn't crash the mapper.
  attendeeIds: (e.rsvps ?? []).map((r) => r.residentId),
})

export const getEvents = () => api.get<EventApiResponse[]>('/events').then((rows) => rows.map(toEvent))

// residentId is ignored server-side for MEMBER callers (forced to the caller's own id by
// requireOwnResidentBody) — sending {} is enough; STAFF/MANAGEMENT would need to pass one.
export const rsvpToEvent = (eventId: string) => api.post<EventApiResponse>(`/events/${eventId}/rsvp`, {}).then(toEvent)
export const cancelEventRsvp = (eventId: string) =>
  api.post<EventApiResponse>(`/events/${eventId}/rsvp/cancel`, {}).then(toEvent)

export interface EventInput {
  title: string
  category: EventCategory
  description: string
  image: string
  date: string
  time: string
  location: string
  capacity: number
}

// Writes require STAFF/MANAGEMENT (enforced server-side). id/rsvps are set by the server.
export const createEvent = (data: EventInput) => api.post<EventApiResponse>('/events', data).then(toEvent)
export const updateEvent = (id: string, data: EventInput) => api.put<EventApiResponse>(`/events/${id}`, data).then(toEvent)
export const deleteEvent = (id: string) => api.del<void>(`/events/${id}`)
