import crypto from 'node:crypto'
import { GuestModel } from '../models/guest.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(GuestModel, 'Guest')

// hostResidentId is forced to the caller's own id for MEMBER by requireOwnResidentBody
// before this runs (STAFF/MANAGEMENT may set it freely — registering a guest on a
// resident's behalf is a legitimate front-desk action). Everything else here is the
// same MEMBER_EDITABLE-shaped set update() already allowlists — without it a raw
// spread would let a caller seed checkedInAt/checkedOutAt on a brand-new PENDING
// guest, fabricating check-in history that never happened.
const CREATE_FIELDS = ['hostResidentId', 'name', 'purpose', 'vehiclePlate', 'arrivalDate', 'arrivalTime']

// STAFF/MANAGEMENT may correct any visit detail and move PENDING -> APPROVED here, but never
// CHECKED_IN/CHECKED_OUT or checkedInAt/checkedOutAt directly — those only ever happen through
// checkIn/checkOut below, which stamp the timestamp server-side and verify the prior state.
// Without this allowlist a raw `{ ...req.body }` spread let a direct API call skip straight to
// CHECKED_IN/CHECKED_OUT (or fabricate the timestamps) without ever going through checkIn/checkOut.
const STAFF_EDITABLE = ['hostResidentId', 'name', 'purpose', 'vehiclePlate', 'arrivalDate', 'arrivalTime', 'status']
const STAFF_STATUS_TRANSITIONS = { PENDING: ['APPROVED'], APPROVED: [], CHECKED_IN: [], CHECKED_OUT: [] }

// A bare "YYYY-MM-DD" (what an <input type="date"> sends) makes Prisma's DateTime
// column throw an unhandled validation error. Accept it defensively here too, not just
// on the frontend — this exact shape of bug has hit multiple date fields already.
const toFullDate = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value)

// Client-guessed pass numbers risk collisions (a 5-digit random suffix is not
// actually unique, just unlikely to collide). Generate a real one here, retrying
// on the rare chance the DB's unique constraint catches a duplicate.
async function generateUniquePassNumber() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `SF-GP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const existing = await GuestModel.findByPassNumber(candidate)
    if (!existing) return candidate
  }
  throw ApiError.badRequest('Could not generate a unique pass number. Please try again.')
}

export const guestController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const passNumber = await generateUniquePassNumber()
    const guest = await GuestModel.create({
      ...pickAllowed(req.body, CREATE_FIELDS),
      arrivalDate: toFullDate(req.body.arrivalDate),
      passNumber,
      status: 'PENDING',
    })
    res.status(201).json(guest)
  }),
  update: asyncHandler(async (req, res) => {
    const current = await GuestModel.findById(req.params.id)
    if (!current) throw ApiError.notFound('Guest not found')

    // A MEMBER owns the record (route guard) but may only edit visit details — never
    // status, check-in timestamps, the host link, or the pass number. Without this
    // allowlist an owner could self-approve/check-in their guest (otherwise staff-only)
    // or reassign the guest to another resident. STAFF/MANAGEMENT keep full control,
    // still allowlisted (see STAFF_EDITABLE) rather than a raw spread.
    const MEMBER_EDITABLE = ['purpose', 'vehiclePlate', 'arrivalDate', 'arrivalTime']
    const data = pickAllowed(req.body, req.user.role === 'MEMBER' ? MEMBER_EDITABLE : STAFF_EDITABLE)

    if ('status' in data && data.status !== current.status) {
      const allowed = STAFF_STATUS_TRANSITIONS[current.status] ?? []
      if (!allowed.includes(data.status)) {
        throw ApiError.conflict(`Can't move a guest from ${current.status.toLowerCase()} to ${data.status.toLowerCase()} here — use check-in/check-out.`)
      }
    }

    if ('arrivalDate' in data) data.arrivalDate = toFullDate(data.arrivalDate)
    const updated = await GuestModel.update(req.params.id, data)
    if (req.user.role !== 'MEMBER' && 'status' in data) logAdminAction(req, 'UPDATE', 'Guest', req.params.id)
    res.json(updated)
  }),
  byResident: asyncHandler(async (req, res) => {
    res.json(await GuestModel.findByResident(req.params.residentId))
  }),
  // Both enforce the lifecycle (PENDING -> APPROVED -> CHECKED_IN -> CHECKED_OUT, see
  // docs/Rules.md) rather than blindly stamping the target status — without this, a
  // client bug or a direct API call could check in a still-pending (never-approved)
  // guest, or flip an already-checked-out guest back to checked-in.
  checkIn: asyncHandler(async (req, res) => {
    const guest = await GuestModel.findById(req.params.id)
    if (!guest) throw ApiError.notFound('Guest not found')
    if (guest.status !== 'APPROVED') {
      throw ApiError.conflict(`Can't check in a guest with status ${guest.status.toLowerCase()} — they must be approved first.`)
    }
    const updated = await GuestModel.update(req.params.id, { status: 'CHECKED_IN', checkedInAt: new Date() })
    logAdminAction(req, 'UPDATE', 'Guest', req.params.id)
    res.json(updated)
  }),
  checkOut: asyncHandler(async (req, res) => {
    const guest = await GuestModel.findById(req.params.id)
    if (!guest) throw ApiError.notFound('Guest not found')
    if (guest.status !== 'CHECKED_IN') {
      throw ApiError.conflict(`Can't check out a guest with status ${guest.status.toLowerCase()} — they must be checked in first.`)
    }
    const updated = await GuestModel.update(req.params.id, { status: 'CHECKED_OUT', checkedOutAt: new Date() })
    logAdminAction(req, 'UPDATE', 'Guest', req.params.id)
    res.json(updated)
  }),
}
