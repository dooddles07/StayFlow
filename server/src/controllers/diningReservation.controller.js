import { DiningReservationModel } from '../models/diningReservation.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const base = buildCrudController(DiningReservationModel, 'Dining reservation')

// A bare "YYYY-MM-DD" makes Prisma's DateTime column throw an unhandled validation
// error. Accept it defensively server-side too — this exact bug shape has already hit
// events and guests; hardening it here rather than trusting every future caller.
const toFullDate = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value)

export const diningReservationController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const reservation = await DiningReservationModel.create({ ...req.body, date: toFullDate(req.body.date) })
    res.status(201).json(reservation)
  }),
  update: asyncHandler(async (req, res) => {
    const data = { ...req.body }
    if ('date' in data) data.date = toFullDate(data.date)
    res.json(await DiningReservationModel.update(req.params.id, data))
  }),
  byResident: asyncHandler(async (req, res) => {
    res.json(await DiningReservationModel.findByResident(req.params.residentId))
  }),
}
