import { Router } from 'express'
import { residentController, residentSelfController } from '../controllers/resident.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { requireRole } from '../middleware/auth.middleware.js'
import { createLoginLimiter } from '../middleware/rateLimit.middleware.js'

const router = Router()

// Self routes first so "me" is never captured by the CRUD "/:id" param route.
// Any authenticated user with a linked residentId (i.e. MEMBERs) may use these.
router.get('/me', residentSelfController.getMe)
router.put('/me', residentSelfController.updateMe)

router.post('/me/family', residentSelfController.addFamilyMember)
router.put('/me/family/:id', residentSelfController.updateFamilyMember)
router.delete('/me/family/:id', residentSelfController.removeFamilyMember)

router.post('/me/vehicles', residentSelfController.addVehicle)
router.put('/me/vehicles/:id', residentSelfController.updateVehicle)
router.delete('/me/vehicles/:id', residentSelfController.removeVehicle)

router.post('/me/notices-seen', residentSelfController.markNoticesSeen)

// MANAGEMENT-only: issue a portal login for an existing resident profile. Stricter
// than the STAFF+MANAGEMENT write access below, so it needs its own role guard
// rather than inheriting buildCrudRouter's writeRoles.
router.post('/:id/create-login', requireRole('MANAGEMENT'), createLoginLimiter, residentController.createLogin)

router.use(
  buildCrudRouter(residentController, {
    readRoles: ['STAFF', 'MANAGEMENT'],
    writeRoles: ['STAFF', 'MANAGEMENT'],
  }),
)

export default router
