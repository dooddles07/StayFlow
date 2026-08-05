import { tableController } from '../controllers/table.controller.js'
import { ALL_ROLES } from '../config/roles.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { requireRole } from '../middleware/auth.middleware.js'
import {
  tableCreateSchema,
  tableUpdateSchema,
} from '../schemas/table.schema.js'

// Residents pick a table when reserving, so open read access is intended.
// MANAGEMENT-only writes: no /staff/* screen exists for table management, so
// STAFF write access was an unused permission, not an intended capability.
const router = buildCrudRouter(tableController, {
  readRoles: ALL_ROLES,
  writeRoles: ['MANAGEMENT'],
  createSchema: tableCreateSchema,
  updateSchema: tableUpdateSchema,
})
router.get(
  '/restaurant/:restaurantId',
  requireRole(...ALL_ROLES),
  tableController.byRestaurant,
)

export default router
