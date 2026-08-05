import { ApiError } from '#/lib/api/client'
import type {
  Facility,
  FacilityCategory,
  FacilityStatus,
} from '#/lib/domain/types'

export const CATEGORIES: FacilityCategory[] = [
  'Wellness',
  'Recreation',
  'Entertainment',
  'Sports',
  'Function',
]
export const STATUSES: FacilityStatus[] = ['open', 'maintenance', 'closed']

export const errText = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Something went wrong. Try again.'

export const DEFAULT_FACILITY_IMAGE = '/images/facilities/pool.webp'

export function newFacilityDraft(): Facility {
  return {
    id: '',
    name: '',
    category: 'Wellness',
    description: '',
    rules: [],
    image: '',
    capacity: 10,
    openHours: '9:00 AM – 9:00 PM',
    status: 'open',
    rating: 4.5,
    location: '',
  }
}
