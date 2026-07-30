import { restaurantController } from '../controllers/restaurant.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'

// MANAGEMENT-only writes: no /staff/* screen exists for restaurant management, so
// STAFF write access was an unused permission, not an intended capability.
export default buildCrudRouter(restaurantController, { writeRoles: ['MANAGEMENT'] })
