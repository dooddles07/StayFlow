import { facilityController } from '../controllers/facility.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { facilityCreateSchema, facilityUpdateSchema } from '../schemas/facility.schema.js'

export default buildCrudRouter(facilityController, { writeRoles: ['STAFF', 'MANAGEMENT'], createSchema: facilityCreateSchema, updateSchema: facilityUpdateSchema })
