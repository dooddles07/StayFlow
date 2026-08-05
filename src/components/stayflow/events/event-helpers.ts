import { format, parseISO } from 'date-fns'
import { ApiError } from '#/lib/api/client'
import type { CommunityEventView } from '#/lib/api/event'
import type { EventCategory } from '#/lib/domain/types'

export const CATEGORIES: EventCategory[] = [
  'Social',
  'Wellness',
  'Kids',
  'Seasonal',
  'Cultural',
]

export const errText = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Something went wrong. Try again.'

export const DEFAULT_EVENT_IMAGE = '/images/events/wine-tasting.webp'

export const eventDate = (iso: string) => format(parseISO(iso), 'MMM d, yyyy')

export const eventTimeRange = (event: CommunityEventView) =>
  event.endTime ? `${event.time} – ${event.endTime}` : event.time

// Real community spaces (from the facilities list + past events), so staff pick a place
// instead of retyping it. "Other" reveals a free-text field for anything not listed.
export const LOCATION_OPTIONS = [
  'Infinity Sky Pool',
  'Apex Fitness Studio',
  'Aurora Screening Room',
  'Championship Tennis Court',
  'Serenity Yoga Deck',
  'The Grand Function Room',
  'Serenity Spa & Sauna',
  'Junior Play Lounge',
  'Skyline Tower · Rooftop',
  'Koi & Copper · Private Room',
]
export const OTHER_LOCATION = 'Other'

// Max size (before base64 inflates it ~33%) for a photo uploaded from a device. Photos are
// stored as data URIs directly in the database (no file storage service configured), so this
// keeps individual event rows reasonable rather than a hard technical ceiling.
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024

export interface EventDraft {
  id?: string
  title: string
  category: EventCategory
  description: string
  image: string
  date: string
  time: string
  endTime: string
  location: string
  capacity: number
}

export function newEventDraft(): EventDraft {
  return {
    title: '',
    category: 'Social',
    description: '',
    image: '',
    date: new Date().toISOString().slice(0, 10),
    time: '6:00 PM',
    endTime: '',
    location: '',
    capacity: 20,
  }
}

export function draftFromEvent(event: CommunityEventView): EventDraft {
  return {
    ...event,
    date: event.date.slice(0, 10),
    endTime: event.endTime ?? '',
  }
}
