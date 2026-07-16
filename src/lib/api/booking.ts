import { api } from './client'
import type { Booking, BookingStatus } from '#/lib/mock/types'

type ApiBookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED'

const STATUS_TO_VIEW: Record<ApiBookingStatus, BookingStatus> = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
}
const STATUS_TO_API: Record<BookingStatus, ApiBookingStatus> = {
  confirmed: 'CONFIRMED',
  pending: 'PENDING',
  cancelled: 'CANCELLED',
}

// Flat shape returned by the API (mirrors the Prisma Booking row + relations).
interface BookingApiResponse {
  id: string
  facilityId: string
  facility?: { id: string; name: string }
  residentId: string
  resident?: { id: string; name: string }
  date: string
  timeSlot: string
  partySize: number
  status: ApiBookingStatus
  notes: string | null
  createdAt: string
}

export interface BookingView extends Booking {
  facilityName?: string
  residentName?: string
}

const toBooking = (b: BookingApiResponse): BookingView => ({
  id: b.id,
  facilityId: b.facilityId,
  facilityName: b.facility?.name,
  residentId: b.residentId,
  residentName: b.resident?.name,
  date: b.date,
  timeSlot: b.timeSlot,
  partySize: b.partySize,
  status: STATUS_TO_VIEW[b.status],
  createdAt: b.createdAt,
  notes: b.notes ?? undefined,
})

// Member: only their own bookings (server enforces via requireOwnResidentParam).
export const getMyBookings = (residentId: string) =>
  api.get<BookingApiResponse[]>(`/bookings/resident/${residentId}`).then((rows) => rows.map(toBooking))

// Staff/management: every booking, for the approvals view.
export const getAllBookings = () => api.get<BookingApiResponse[]>('/bookings').then((rows) => rows.map(toBooking))

// Any authenticated role — just enough to know which slots are taken (no resident PII).
export interface FacilitySlot {
  date: string
  timeSlot: string
  status: BookingStatus
}
export const getFacilityBookings = (facilityId: string) =>
  api
    .get<{ date: string; timeSlot: string; status: ApiBookingStatus }[]>(`/bookings/facility/${facilityId}`)
    .then((rows) => rows.map((r) => ({ date: r.date, timeSlot: r.timeSlot, status: STATUS_TO_VIEW[r.status] })))

export interface BookingInput {
  facilityId: string
  date: string
  timeSlot: string
  partySize: number
  notes?: string
}

// residentId is forced server-side for MEMBER callers; status starts PENDING.
export const requestBooking = (data: BookingInput) => api.post<BookingApiResponse>('/bookings', data).then(toBooking)

// Staff-only route — approve or reject a pending booking.
export const setBookingStatus = (id: string, status: BookingStatus) =>
  api.put<BookingApiResponse>(`/bookings/${id}`, { status: STATUS_TO_API[status] }).then(toBooking)

// Owner-guarded server-side — a resident can only cancel a booking they made themselves.
export const cancelBooking = (id: string) => api.del<void>(`/bookings/${id}`)
