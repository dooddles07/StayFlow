import { Router } from 'express'
import { diningReservationController } from '../controllers/diningReservation.controller.js'
import { DiningReservationModel } from '../models/diningReservation.model.js'
import { requireOwnResidentBody, requireOwnResidentParam, requireOwnerRecord, requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import { diningReservationCreateSchema, diningReservationUpdateSchema } from '../schemas/diningReservation.schema.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownRecord = requireOwnerRecord(DiningReservationModel)

const router = Router()
router.get('/', staffOnly, diningReservationController.list)
router.get('/resident/:residentId', requireOwnResidentParam(), diningReservationController.byResident)
router.get('/:id', ownRecord, diningReservationController.getOne)
router.post('/', requireOwnResidentBody(), validateBody(diningReservationCreateSchema), diningReservationController.create)
router.put('/:id', staffOnly, validateBody(diningReservationUpdateSchema), diningReservationController.update)
router.delete('/:id', ownRecord, diningReservationController.remove)

export default router
