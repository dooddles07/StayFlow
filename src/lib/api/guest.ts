import { api } from './client'
import type { Guest, GuestStatus } from '#/lib/mock/types'

type ApiGuestStatus = 'PENDING' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT'

const STATUS_TO_VIEW: Record<ApiGuestStatus, GuestStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CHECKED_IN: 'checked-in',
  CHECKED_OUT: 'checked-out',
}
const STATUS_TO_API: Record<GuestStatus, ApiGuestStatus> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  'checked-in': 'CHECKED_IN',
  'checked-out': 'CHECKED_OUT',
}

// Flat shape returned by the API (mirrors the Prisma Guest row + hostResident relation).
interface GuestApiResponse {
  id: string
  name: string
  hostResidentId: string
  hostResident?: { id: string; name: string }
  purpose: string
  vehiclePlate: string | null
  arrivalDate: string
  arrivalTime: string
  passNumber: string
  status: ApiGuestStatus
  checkedInAt: string | null
  checkedOutAt: string | null
}

// View model — same Guest shape the UI already used, plus the host's name when included.
export interface GuestView extends Guest {
  hostName?: string
}

const toGuest = (g: GuestApiResponse): GuestView => ({
  id: g.id,
  name: g.name,
  hostResidentId: g.hostResidentId,
  hostName: g.hostResident?.name,
  purpose: g.purpose,
  vehiclePlate: g.vehiclePlate ?? undefined,
  arrivalDate: g.arrivalDate,
  arrivalTime: g.arrivalTime,
  passNumber: g.passNumber,
  status: STATUS_TO_VIEW[g.status],
  checkedInAt: g.checkedInAt ?? undefined,
  checkedOutAt: g.checkedOutAt ?? undefined,
})

// Member: only their own registered guests (server enforces this via requireOwnResidentParam).
export const getMyGuests = (residentId: string) =>
  api.get<GuestApiResponse[]>(`/guests/resident/${residentId}`).then((rows) => rows.map(toGuest))

// Staff/management: every guest, for the front-desk arriving/history views.
export const getAllGuests = () => api.get<GuestApiResponse[]>('/guests').then((rows) => rows.map(toGuest))

export interface GuestRegistration {
  name: string
  purpose: string
  vehiclePlate?: string
  arrivalDate: string
  arrivalTime: string
}

// hostResidentId/passNumber/status are set server-side — never client-supplied.
export const registerGuest = (data: GuestRegistration) =>
  api.post<GuestApiResponse>('/guests', data).then(toGuest)

export const setGuestStatus = (id: string, status: GuestStatus) =>
  api.put<GuestApiResponse>(`/guests/${id}`, { status: STATUS_TO_API[status] }).then(toGuest)

export const checkInGuest = (id: string) => api.post<GuestApiResponse>(`/guests/${id}/check-in`, {}).then(toGuest)
export const checkOutGuest = (id: string) => api.post<GuestApiResponse>(`/guests/${id}/check-out`, {}).then(toGuest)

// Owner-guarded server-side — a resident can only cancel a guest they registered themselves.
export const cancelGuest = (id: string) => api.del<void>(`/guests/${id}`)

export interface GuestDetailsEdit {
  purpose: string
  vehiclePlate?: string
  arrivalDate: string
  arrivalTime: string
}

// Owner-guarded server-side, same as cancelGuest. name/status/passNumber aren't editable here.
export const updateGuestDetails = (id: string, data: GuestDetailsEdit) =>
  api.put<GuestApiResponse>(`/guests/${id}`, data).then(toGuest)
