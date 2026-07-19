import { BookingModel } from '../models/booking.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { requirePositiveInt } from '../utils/validate.js'

const base = buildCrudController(BookingModel, 'Booking')

// A bare "YYYY-MM-DD" makes Prisma's DateTime column throw an unhandled validation
// error. Accept it defensively server-side too — this bug shape has already hit
// events, guests, and dining reservations.
const toFullDate = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value)

export const bookingController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const date = toFullDate(req.body.date)
    const partySize = requirePositiveInt(req.body.partySize, 'partySize')
    const conflict = await BookingModel.findSlotConflict(req.body.facilityId, date, req.body.timeSlot)
    if (conflict) throw ApiError.conflict('That slot was just taken. Pick another time.')
    const booking = await BookingModel.create({ ...req.body, date, partySize })
    res.status(201).json(booking)
  }),
  update: asyncHandler(async (req, res) => {
    const data = { ...req.body }
    if ('date' in data) data.date = toFullDate(data.date)
    if ('partySize' in data) data.partySize = requirePositiveInt(data.partySize, 'partySize')
    res.json(await BookingModel.update(req.params.id, data))
  }),
  byResident: asyncHandler(async (req, res) => {
    res.json(await BookingModel.findByResident(req.params.residentId))
  }),
  byFacility: asyncHandler(async (req, res) => {
    res.json(await BookingModel.findByFacility(req.params.facilityId))
  }),
}
