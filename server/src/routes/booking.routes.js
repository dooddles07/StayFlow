import { Router } from 'express'
import { bookingController } from '../controllers/booking.controller.js'
import { BookingModel } from '../models/booking.model.js'
import { requireOwnResidentBody, requireOwnResidentParam, requireOwnerRecord, requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import { bookingCreateSchema, bookingUpdateSchema } from '../schemas/booking.schema.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownRecord = requireOwnerRecord(BookingModel)

const router = Router()
router.get('/', staffOnly, bookingController.list)
router.get('/resident/:residentId', requireOwnResidentParam(), bookingController.byResident)
router.get('/facility/:facilityId', bookingController.byFacility)
router.get('/:id', ownRecord, bookingController.getOne)
router.post('/', requireOwnResidentBody(), validateBody(bookingCreateSchema), bookingController.create)
router.put('/:id', staffOnly, validateBody(bookingUpdateSchema), bookingController.update)
router.delete('/:id', ownRecord, bookingController.remove)

export default router
