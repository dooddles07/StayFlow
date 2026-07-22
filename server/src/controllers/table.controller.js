import { TableModel } from '../models/table.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(TableModel, 'Table')

// Matches the DiningTable schema fields — no client UI drives table CRUD directly
// today, but the routes are live and STAFF/MANAGEMENT-writable regardless.
const FIELDS = ['restaurantId', 'label', 'seats', 'status']

export const tableController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const item = await TableModel.create(pickAllowed(req.body, FIELDS))
    logAdminAction(req, 'CREATE', 'DiningTable', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const item = await TableModel.update(req.params.id, pickAllowed(req.body, FIELDS))
    logAdminAction(req, 'UPDATE', 'DiningTable', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await TableModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'DiningTable', req.params.id)
    res.status(204).send()
  }),
  byRestaurant: asyncHandler(async (req, res) => {
    res.json(await TableModel.findByRestaurant(req.params.restaurantId))
  }),
}
