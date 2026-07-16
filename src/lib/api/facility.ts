import { api } from './client'
import type { Facility, FacilityStatus } from '#/lib/mock/types'

type ApiFacilityStatus = 'OPEN' | 'MAINTENANCE' | 'CLOSED'

const STATUS_TO_VIEW: Record<ApiFacilityStatus, FacilityStatus> = {
  OPEN: 'open',
  MAINTENANCE: 'maintenance',
  CLOSED: 'closed',
}
const STATUS_TO_API: Record<FacilityStatus, ApiFacilityStatus> = {
  open: 'OPEN',
  maintenance: 'MAINTENANCE',
  closed: 'CLOSED',
}

interface FacilityApiResponse {
  id: string
  name: string
  category: Facility['category']
  description: string
  rules: string[]
  image: string
  capacity: number
  openHours: string
  status: ApiFacilityStatus
  statusReason: string | null
  rating: number
  location: string
}

const toFacility = (f: FacilityApiResponse): Facility => ({
  id: f.id,
  name: f.name,
  category: f.category,
  description: f.description,
  rules: f.rules,
  image: f.image,
  capacity: f.capacity,
  openHours: f.openHours,
  status: STATUS_TO_VIEW[f.status],
  statusReason: f.statusReason ?? undefined,
  rating: f.rating,
  location: f.location,
})

export const getFacilities = () => api.get<FacilityApiResponse[]>('/facilities').then((rows) => rows.map(toFacility))
export const getFacility = (id: string) => api.get<FacilityApiResponse>(`/facilities/${id}`).then(toFacility)

export interface FacilityInput {
  name: string
  category: Facility['category']
  description: string
  rules: string[]
  image: string
  capacity: number
  openHours: string
  location: string
  rating: number
  status: FacilityStatus
  statusReason?: string
}

// Writes require STAFF/MANAGEMENT (enforced server-side). id is set by the server.
export const createFacility = (data: FacilityInput) =>
  api
    .post<FacilityApiResponse>('/facilities', { ...data, status: STATUS_TO_API[data.status], statusReason: data.statusReason ?? null })
    .then(toFacility)
export const updateFacility = (id: string, data: FacilityInput) =>
  api
    .put<FacilityApiResponse>(`/facilities/${id}`, { ...data, status: STATUS_TO_API[data.status], statusReason: data.statusReason ?? null })
    .then(toFacility)
export const deleteFacility = (id: string) => api.del<void>(`/facilities/${id}`)

// Staff status control — open/maintenance/closed, with an optional reason.
export const setFacilityStatus = (id: string, status: FacilityStatus, statusReason?: string) =>
  api.put<FacilityApiResponse>(`/facilities/${id}`, { status: STATUS_TO_API[status], statusReason: statusReason ?? null }).then(toFacility)
