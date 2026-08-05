import { Router } from 'express'
import { bookingController } from '../controllers/booking.controller.js'
import { BookingModel } from '../models/booking.model.js'
import { ALL_ROLES, STAFF_ROLES } from '../config/roles.js'
import {
  requireOwnResidentBody,
  requireOwnResidentParam,
  requireOwnerRecord,
  requireRole,
} from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import {
  bookingCreateSchema,
  bookingUpdateSchema,
} from '../schemas/booking.schema.js'

const staffOnly = requireRole(...STAFF_ROLES)
const ownRecord = requireOwnerRecord(BookingModel)

const router = Router()
router.get('/', staffOnly, bookingController.list)
router.get(
  '/resident/:residentId',
  requireOwnResidentParam(),
  bookingController.byResident,
)
// Open to every role by design: residents need the taken slots to render a
// facility's availability grid. The projection is date/timeSlot/status only
// (booking.model.js) — no resident identity is exposed.
router.get(
  '/facility/:facilityId',
  requireRole(...ALL_ROLES),
  bookingController.byFacility,
)
router.get('/:id', ownRecord, bookingController.getOne)
router.post(
  '/',
  requireOwnResidentBody(),
  validateBody(bookingCreateSchema),
  bookingController.create,
)
router.put(
  '/:id',
  staffOnly,
  validateBody(bookingUpdateSchema),
  bookingController.update,
)
router.delete('/:id', ownRecord, bookingController.remove)

export default router
