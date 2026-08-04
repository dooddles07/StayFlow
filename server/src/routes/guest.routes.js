import { Router } from 'express'
import { guestController } from '../controllers/guest.controller.js'
import { GuestModel } from '../models/guest.model.js'
import { requireOwnResidentBody, requireOwnResidentParam, requireOwnerRecord, requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import { guestCreateSchema, guestUpdateSchema } from '../schemas/guest.schema.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownRecord = requireOwnerRecord(GuestModel, 'hostResidentId')

const router = Router()
router.get('/', staffOnly, guestController.list)
router.get('/resident/:residentId', requireOwnResidentParam(), guestController.byResident)
router.get('/:id', ownRecord, guestController.getOne)
router.post('/', requireOwnResidentBody('hostResidentId'), validateBody(guestCreateSchema), guestController.create)
router.put('/:id', ownRecord, validateBody(guestUpdateSchema), guestController.update)
router.delete('/:id', ownRecord, guestController.remove)
router.post('/:id/check-in', staffOnly, guestController.checkIn)
router.post('/:id/check-out', staffOnly, guestController.checkOut)

export default router
