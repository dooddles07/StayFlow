import { noticeController } from '../controllers/notice.controller.js'
import { ALL_ROLES } from '../config/roles.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import {
  noticeCreateSchema,
  noticeUpdateSchema,
} from '../schemas/notice.schema.js'

// Notices are property-wide announcements every signed-in user is meant to read.
// MANAGEMENT-only writes: no /staff/* screen exists for notice authoring, so
// STAFF write access was an unused permission, not an intended capability.
export default buildCrudRouter(noticeController, {
  readRoles: ALL_ROLES,
  writeRoles: ['MANAGEMENT'],
  createSchema: noticeCreateSchema,
  updateSchema: noticeUpdateSchema,
})
