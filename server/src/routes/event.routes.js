import { eventController } from '../controllers/event.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { requireOwnResidentBody } from '../middleware/auth.middleware.js'

// MANAGEMENT-only writes: no /staff/* screen exists for event authoring, so
// STAFF write access was an unused permission, not an intended capability.
const router = buildCrudRouter(eventController, { writeRoles: ['MANAGEMENT'] })
router.post('/:id/rsvp', requireOwnResidentBody(), eventController.rsvp)
router.post('/:id/rsvp/cancel', requireOwnResidentBody(), eventController.cancelRsvp)

export default router
