import { staffController } from '../controllers/staff.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { staffCreateSchema, staffUpdateSchema } from '../schemas/staff.schema.js'

export default buildCrudRouter(staffController, {
  readRoles: ['STAFF', 'MANAGEMENT'],
  writeRoles: ['MANAGEMENT'],
  createSchema: staffCreateSchema,
  updateSchema: staffUpdateSchema,
})
