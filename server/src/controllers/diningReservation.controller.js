import { DiningReservationModel } from '../models/diningReservation.model.js'
import { RestaurantModel } from '../models/restaurant.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { requirePositiveInt } from '../utils/validate.js'

const base = buildCrudController(DiningReservationModel, 'Dining reservation')

// A bare "YYYY-MM-DD" makes Prisma's DateTime column throw an unhandled validation
// error. Accept it defensively server-side too — this exact bug shape has already hit
// events and guests; hardening it here rather than trusting every future caller.
const toFullDate = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value)

// The client's party-size input caps at restaurant.maxPartySize, but that's UI-only —
// a direct API call could skip it entirely. Enforce it here too.
async function assertWithinCapacity(restaurantId, partySize) {
  const restaurant = await RestaurantModel.findById(restaurantId)
  if (!restaurant) throw ApiError.badRequest('Restaurant not found.')
  if (partySize > restaurant.maxPartySize) {
    throw ApiError.badRequest(`Party of ${partySize} exceeds this restaurant's max online party size of ${restaurant.maxPartySize}. Call the restaurant directly for larger groups.`)
  }
}

export const diningReservationController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const partySize = requirePositiveInt(req.body.partySize, 'partySize')
    await assertWithinCapacity(req.body.restaurantId, partySize)
    const reservation = await DiningReservationModel.create({ ...req.body, date: toFullDate(req.body.date), partySize })
    res.status(201).json(reservation)
  }),
  // Status transitions carry real-world side effects on the table map — a plain field
  // edit never touches a table, but confirming/arriving/cancelling does.
  update: asyncHandler(async (req, res) => {
    const data = { ...req.body }
    if ('date' in data) data.date = toFullDate(data.date)
    if ('partySize' in data) data.partySize = requirePositiveInt(data.partySize, 'partySize')

    if (data.status || 'partySize' in data) {
      const current = await DiningReservationModel.findById(req.params.id)
      if (!current) throw ApiError.notFound('Dining reservation not found')

      if ('partySize' in data) {
        await assertWithinCapacity(data.restaurantId ?? current.restaurantId, data.partySize)
      }

      const effectivePartySize = data.partySize ?? current.partySize

      if (data.status === 'CONFIRMED' && !current.tableId) {
        const table = await DiningReservationModel.findAvailableTable(current.restaurantId, effectivePartySize)
        if (!table) throw ApiError.conflict(`No available table seats a party of ${effectivePartySize} right now.`)
        await DiningReservationModel.setTableStatus(table.id, 'RESERVED')
        data.tableId = table.id
      }

      if (data.status === 'ARRIVED' && current.tableId) {
        await DiningReservationModel.setTableStatus(current.tableId, 'OCCUPIED')
      }

      if (data.status === 'CANCELLED' && current.tableId && current.status === 'CONFIRMED') {
        await DiningReservationModel.setTableStatus(current.tableId, 'AVAILABLE')
      }
    }

    res.json(await DiningReservationModel.update(req.params.id, data))
  }),
  byResident: asyncHandler(async (req, res) => {
    res.json(await DiningReservationModel.findByResident(req.params.residentId))
  }),
  // A confirmed/arrived reservation holds a table (RESERVED/OCCUPIED). Deleting the
  // reservation without releasing it would strand that table — nothing else ever
  // assigns it again, since findAvailableTable only looks at AVAILABLE tables. The
  // generic crudController.remove doesn't know about this side effect, so it's
  // overridden here rather than inherited from `base`.
  remove: asyncHandler(async (req, res) => {
    const current = await DiningReservationModel.findById(req.params.id)
    if (!current) throw ApiError.notFound('Dining reservation not found')
    if (current.tableId) await DiningReservationModel.setTableStatus(current.tableId, 'AVAILABLE')
    await DiningReservationModel.remove(req.params.id)
    res.status(204).send()
  }),
}
