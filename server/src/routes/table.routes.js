import { tableController } from '../controllers/table.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'

// MANAGEMENT-only writes: no /staff/* screen exists for table management, so
// STAFF write access was an unused permission, not an intended capability.
const router = buildCrudRouter(tableController, { writeRoles: ['MANAGEMENT'] })
router.get('/restaurant/:restaurantId', tableController.byRestaurant)

export default router
