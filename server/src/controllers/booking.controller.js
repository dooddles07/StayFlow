import { BookingModel } from '../models/booking.model.js'
import { FacilityModel } from '../models/facility.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { pickAllowed, requirePositiveInt } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(BookingModel, 'Booking')

// Mirrors BookingInput in src/lib/api/booking.ts plus residentId, which the client never
// sends directly — requireOwnResidentBody() (booking.routes.js) injects it into req.body
// before this runs. Allowlisting (rather than spreading req.body and overriding status/
// partySize after) also blocks a caller from supplying id/createdAt directly.
const CREATE_FIELDS = ['residentId', 'facilityId', 'date', 'timeSlot', 'partySize', 'notes']

// The staff UI only ever PUTs { status } (see setBookingStatus in src/lib/api/booking.ts) —
// date/facilityId/partySize are set once at create and never revised after. Allowlisting to
// just this closes a raw-spread mass-assignment gap (STAFF could otherwise reassign
// residentId/facilityId, or change partySize/facilityId with zero capacity re-check).
const ADMIN_UPDATE_FIELDS = ['status']

// Matches what the staff UI actually drives (approve/reject a pending booking, or cancel a
// confirmed one) — anything else, e.g. PENDING jumping straight past CONFIRMED, is rejected
// rather than silently allowed.
const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED'],
  CANCELLED: [],
}

// A bare "YYYY-MM-DD" makes Prisma's DateTime column throw an unhandled validation
// error. Accept it defensively server-side too — this bug shape has already hit
// events, guests, and dining reservations.
const toFullDate = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value)

// The client's party-size picker caps at facility.capacity, but that's UI-only — a
// direct API call could skip it entirely. Enforce it here so a facility genuinely
// can never take a booking bigger than it physically fits.
async function assertWithinCapacity(facilityId, partySize) {
  const facility = await FacilityModel.findById(facilityId)
  if (!facility) throw ApiError.badRequest('Facility not found.')
  if (partySize > facility.capacity) {
    throw ApiError.badRequest(`Party of ${partySize} exceeds this facility's capacity of ${facility.capacity}.`)
  }
}

export const bookingController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const data = pickAllowed(req.body, CREATE_FIELDS)
    data.date = toFullDate(data.date)
    data.partySize = requirePositiveInt(data.partySize, 'partySize')
    await assertWithinCapacity(data.facilityId, data.partySize)
    // Force PENDING regardless of client input — status isn't in CREATE_FIELDS at all, but
    // set it explicitly too so intent stays obvious here rather than purely by omission.
    data.status = 'PENDING'
    const booking = await BookingModel.createIfNoConflict(data)
    if (!booking) throw ApiError.conflict('That slot was just taken. Pick another time.')
    res.status(201).json(booking)
  }),
  update: asyncHandler(async (req, res) => {
    const current = await BookingModel.findById(req.params.id)
    if (!current) throw ApiError.notFound('Booking not found')

    const data = pickAllowed(req.body, ADMIN_UPDATE_FIELDS)
    if ('status' in data && data.status !== current.status) {
      const allowed = VALID_TRANSITIONS[current.status] ?? []
      if (!allowed.includes(data.status)) {
        throw ApiError.conflict(`Can't move a booking from ${current.status.toLowerCase()} to ${data.status.toLowerCase()}.`)
      }
    }
    const updated = await BookingModel.update(req.params.id, data)
    if ('status' in data) logAdminAction(req, 'UPDATE', 'Booking', req.params.id)
    res.json(updated)
  }),
  byResident: asyncHandler(async (req, res) => {
    res.json(await BookingModel.findByResident(req.params.residentId))
  }),
  byFacility: asyncHandler(async (req, res) => {
    res.json(await BookingModel.findByFacility(req.params.facilityId))
  }),
}
