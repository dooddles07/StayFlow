import { Router } from 'express'
import { residentController, residentSelfController } from '../controllers/resident.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'

const router = Router()

// Self routes first so "me" is never captured by the CRUD "/:id" param route.
// Any authenticated user with a linked residentId (i.e. MEMBERs) may use these.
router.get('/me', residentSelfController.getMe)
router.put('/me', residentSelfController.updateMe)

router.use(
  buildCrudRouter(residentController, {
    readRoles: ['STAFF', 'MANAGEMENT'],
    writeRoles: ['STAFF', 'MANAGEMENT'],
  }),
)

export default router
