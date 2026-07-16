import { api } from './client'
import type { DiningReservation, DiningReservationStatus } from '#/lib/mock/types'

type ApiStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'ARRIVED'

const STATUS_TO_VIEW: Record<ApiStatus, DiningReservationStatus> = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  ARRIVED: 'arrived',
}
const STATUS_TO_API: Record<DiningReservationStatus, ApiStatus> = {
  confirmed: 'CONFIRMED',
  pending: 'PENDING',
  cancelled: 'CANCELLED',
  arrived: 'ARRIVED',
}

// Flat shape returned by the API (mirrors the Prisma DiningReservation row + relations).
interface ReservationApiResponse {
  id: string
  restaurantId: string
  restaurant?: { id: string; name: string }
  residentId: string
  resident?: { id: string; name: string }
  date: string
  time: string
  partySize: number
  occasion: string | null
  dietary: string | null
  seating: DiningReservation['seating']
  status: ApiStatus
  createdAt: string
}

export interface ReservationView extends DiningReservation {
  restaurantName?: string
  residentName?: string
}

const toReservation = (r: ReservationApiResponse): ReservationView => ({
  id: r.id,
  restaurantId: r.restaurantId,
  restaurantName: r.restaurant?.name,
  residentId: r.residentId,
  residentName: r.resident?.name,
  date: r.date,
  time: r.time,
  partySize: r.partySize,
  occasion: r.occasion ?? undefined,
  dietary: r.dietary ?? undefined,
  seating: r.seating,
  status: STATUS_TO_VIEW[r.status],
  createdAt: r.createdAt,
})

// Member: only their own reservations (server enforces via requireOwnResidentParam).
export const getMyReservations = (residentId: string) =>
  api.get<ReservationApiResponse[]>(`/dining-reservations/resident/${residentId}`).then((rows) => rows.map(toReservation))

// Staff/management: every reservation, for the front-of-house view.
export const getAllReservations = () => api.get<ReservationApiResponse[]>('/dining-reservations').then((rows) => rows.map(toReservation))

export interface ReservationInput {
  restaurantId: string
  date: string
  time: string
  partySize: number
  occasion?: string
  dietary?: string
  seating: DiningReservation['seating']
}

// residentId is forced server-side for MEMBER callers; status starts PENDING.
export const requestReservation = (data: ReservationInput) =>
  api.post<ReservationApiResponse>('/dining-reservations', data).then(toReservation)

// Staff-only route — status transitions (confirm a pending request, mark arrived, decline).
export const setReservationStatus = (id: string, status: DiningReservationStatus) =>
  api.put<ReservationApiResponse>(`/dining-reservations/${id}`, { status: STATUS_TO_API[status] }).then(toReservation)

// Owner-guarded server-side — a resident can only cancel a reservation they made themselves.
export const cancelReservation = (id: string) => api.del<void>(`/dining-reservations/${id}`)
