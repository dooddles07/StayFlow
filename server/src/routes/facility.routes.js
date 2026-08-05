import { facilityController } from '../controllers/facility.controller.js'
import { ALL_ROLES, STAFF_ROLES } from '../config/roles.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import {
  facilityCreateSchema,
  facilityUpdateSchema,
} from '../schemas/facility.schema.js'

// Residents browse and book facilities, so open read access is intended here.
export default buildCrudRouter(facilityController, {
  readRoles: ALL_ROLES,
  writeRoles: STAFF_ROLES,
  createSchema: facilityCreateSchema,
  updateSchema: facilityUpdateSchema,
})
