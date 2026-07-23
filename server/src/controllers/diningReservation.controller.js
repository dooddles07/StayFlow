import { DiningReservationModel } from '../models/diningReservation.model.js'
import { RestaurantModel } from '../models/restaurant.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { pickAllowed, requirePositiveInt } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(DiningReservationModel, 'Dining reservation')

// Mirrors ReservationInput in src/lib/api/diningReservation.ts plus residentId, which the
// client never sends directly — requireOwnResidentBody() (diningReservation.routes.js)
// injects it into req.body before this runs. Allowlisting (rather than spreading req.body
// and overriding status/tableId after) also blocks a caller from supplying id/createdAt.
const CREATE_FIELDS = ['residentId', 'restaurantId', 'date', 'time', 'partySize', 'occasion', 'dietary', 'seating']

// The staff UI only ever PUTs { status } (see setReservationStatus in
// src/lib/api/diningReservation.ts) — date/partySize/restaurantId are set once at create and
// never revised after. Allowlisting to just this closes a raw-spread mass-assignment gap
// (STAFF could otherwise reassign residentId/restaurantId/tableId directly).
const ADMIN_UPDATE_FIELDS = ['status']

// Matches what the staff UI actually drives (confirm, mark arrived, decline) — anything
// else, e.g. PENDING jumping straight to ARRIVED, skips the table-assignment/capacity
// checks below entirely, so it's rejected rather than silently allowed.
const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ARRIVED', 'CANCELLED'],
  ARRIVED: [],
  CANCELLED: [],
}

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
    const data = pickAllowed(req.body, CREATE_FIELDS)
    data.date = toFullDate(data.date)
    data.partySize = requirePositiveInt(data.partySize, 'partySize')
    await assertWithinCapacity(data.restaurantId, data.partySize)
    // Force PENDING and tableId: null regardless of client input — neither is in
    // CREATE_FIELDS, but set explicitly too so a MEMBER can't self-confirm or self-assign
    // any table (occupied or not), skipping assignTableIfAvailable's capacity check.
    data.status = 'PENDING'
    data.tableId = null
    const reservation = await DiningReservationModel.create(data)
    res.status(201).json(reservation)
  }),
  // Status transitions carry real-world side effects on the table map — a plain field
  // edit never touches a table, but confirming/arriving/cancelling does. Status is also the
  // only field an update may touch at all now (see ADMIN_UPDATE_FIELDS above).
  update: asyncHandler(async (req, res) => {
    const current = await DiningReservationModel.findById(req.params.id)
    if (!current) throw ApiError.notFound('Dining reservation not found')

    const data = pickAllowed(req.body, ADMIN_UPDATE_FIELDS)

    if ('status' in data && data.status !== current.status) {
      const allowed = VALID_TRANSITIONS[current.status] ?? []
      if (!allowed.includes(data.status)) {
        throw ApiError.conflict(`Can't move a reservation from ${current.status.toLowerCase()} to ${data.status.toLowerCase()}.`)
      }

      if (data.status === 'CONFIRMED' && !current.tableId) {
        const table = await DiningReservationModel.assignTableIfAvailable(current.restaurantId, current.partySize)
        if (!table) throw ApiError.conflict(`No available table seats a party of ${current.partySize} right now.`)
        data.tableId = table.id
      }

      if (data.status === 'ARRIVED' && current.tableId) {
        await DiningReservationModel.setTableStatus(current.tableId, 'OCCUPIED')
      }

      if (data.status === 'CANCELLED' && current.tableId && current.status === 'CONFIRMED') {
        await DiningReservationModel.setTableStatus(current.tableId, 'AVAILABLE')
      }
    }

    const updated = await DiningReservationModel.update(req.params.id, data)
    if ('status' in data) logAdminAction(req, 'UPDATE', 'DiningReservation', req.params.id)
    res.json(updated)
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
    // requireOwnerRecord already fetched this row for a MEMBER caller; STAFF/MANAGEMENT
    // never populate req.record here, so this still fetches for them.
    const current = req.record ?? (await DiningReservationModel.findById(req.params.id))
    if (!current) throw ApiError.notFound('Dining reservation not found')
    if (current.tableId) await DiningReservationModel.setTableStatus(current.tableId, 'AVAILABLE')
    await DiningReservationModel.remove(req.params.id)
    res.status(204).send()
  }),
}
