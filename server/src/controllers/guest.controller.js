import crypto from 'node:crypto'
import { GuestModel } from '../models/guest.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'

const base = buildCrudController(GuestModel, 'Guest')

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
      ...req.body,
      arrivalDate: toFullDate(req.body.arrivalDate),
      passNumber,
      status: 'PENDING',
    })
    res.status(201).json(guest)
  }),
  update: asyncHandler(async (req, res) => {
    // A MEMBER owns the record (route guard) but may only edit visit details — never
    // status, check-in timestamps, the host link, or the pass number. Without this
    // allowlist an owner could self-approve/check-in their guest (otherwise staff-only)
    // or reassign the guest to another resident. STAFF/MANAGEMENT keep full control.
    const MEMBER_EDITABLE = ['purpose', 'vehiclePlate', 'arrivalDate', 'arrivalTime']
    const data =
      req.user.role === 'MEMBER'
        ? Object.fromEntries(MEMBER_EDITABLE.filter((f) => f in req.body).map((f) => [f, req.body[f]]))
        : { ...req.body }
    if ('arrivalDate' in data) data.arrivalDate = toFullDate(data.arrivalDate)
    // passNumber is server-assigned at creation and never client-editable afterward.
    delete data.passNumber
    res.json(await GuestModel.update(req.params.id, data))
  }),
  byResident: asyncHandler(async (req, res) => {
    res.json(await GuestModel.findByResident(req.params.residentId))
  }),
  checkIn: asyncHandler(async (req, res) => {
    res.json(await GuestModel.update(req.params.id, { status: 'CHECKED_IN', checkedInAt: new Date() }))
  }),
  checkOut: asyncHandler(async (req, res) => {
    res.json(await GuestModel.update(req.params.id, { status: 'CHECKED_OUT', checkedOutAt: new Date() }))
  }),
}
