import { eventController } from '../controllers/event.controller.js'
import { ALL_ROLES } from '../config/roles.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { requireOwnResidentBody } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import {
  eventCreateSchema,
  eventRsvpSchema,
  eventUpdateSchema,
} from '../schemas/event.schema.js'

// Residents browse and RSVP to community events, so open read access is intended.
// MANAGEMENT-only writes: no /staff/* screen exists for event authoring, so
// STAFF write access was an unused permission, not an intended capability.
const router = buildCrudRouter(eventController, {
  readRoles: ALL_ROLES,
  writeRoles: ['MANAGEMENT'],
  createSchema: eventCreateSchema,
  updateSchema: eventUpdateSchema,
})
router.post(
  '/:id/rsvp',
  requireOwnResidentBody(),
  validateBody(eventRsvpSchema),
  eventController.rsvp,
)
router.post(
  '/:id/rsvp/cancel',
  requireOwnResidentBody(),
  validateBody(eventRsvpSchema),
  eventController.cancelRsvp,
)

export default router
