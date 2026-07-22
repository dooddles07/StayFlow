import { RestaurantModel } from '../models/restaurant.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(RestaurantModel, 'Restaurant')

// Matches src/lib/api/restaurant.ts's RestaurantInput.
const FIELDS = ['name', 'cuisine', 'description', 'image', 'openHours', 'priceRange', 'rating', 'location', 'maxPartySize']

export const restaurantController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const item = await RestaurantModel.create(pickAllowed(req.body, FIELDS))
    logAdminAction(req, 'CREATE', 'Restaurant', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const item = await RestaurantModel.update(req.params.id, pickAllowed(req.body, FIELDS))
    logAdminAction(req, 'UPDATE', 'Restaurant', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await RestaurantModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Restaurant', req.params.id)
    res.status(204).send()
  }),
}
