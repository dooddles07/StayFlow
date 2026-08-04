import { noticeController } from '../controllers/notice.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { noticeCreateSchema, noticeUpdateSchema } from '../schemas/notice.schema.js'

// MANAGEMENT-only writes: no /staff/* screen exists for notice authoring, so
// STAFF write access was an unused permission, not an intended capability.
export default buildCrudRouter(noticeController, { writeRoles: ['MANAGEMENT'], createSchema: noticeCreateSchema, updateSchema: noticeUpdateSchema })
