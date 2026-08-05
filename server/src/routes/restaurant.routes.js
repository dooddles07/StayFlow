import { restaurantController } from '../controllers/restaurant.controller.js'
import { ALL_ROLES } from '../config/roles.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import {
  restaurantCreateSchema,
  restaurantUpdateSchema,
} from '../schemas/restaurant.schema.js'

// Residents browse restaurants to make dining reservations, so open read access
// is intended here. MANAGEMENT-only writes: no /staff/* screen exists for
// restaurant management, so STAFF write access was an unused permission.
export default buildCrudRouter(restaurantController, {
  readRoles: ALL_ROLES,
  writeRoles: ['MANAGEMENT'],
  createSchema: restaurantCreateSchema,
  updateSchema: restaurantUpdateSchema,
})
