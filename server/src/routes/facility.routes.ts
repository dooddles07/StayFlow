import { Router } from 'express'
import * as FacilityController from '../controllers/facility.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

export const facilityRouter = Router()

facilityRouter.use(requireAuth)
facilityRouter.get('/', asyncHandler(FacilityController.list))
facilityRouter.get('/:id', asyncHandler(FacilityController.getById))
facilityRouter.post('/', requireRole('MANAGEMENT'), asyncHandler(FacilityController.create))
facilityRouter.patch('/:id', requireRole('MANAGEMENT'), asyncHandler(FacilityController.update))
facilityRouter.patch('/:id/status', requireRole('STAFF', 'MANAGEMENT'), asyncHandler(FacilityController.updateStatus))
facilityRouter.delete('/:id', requireRole('MANAGEMENT'), asyncHandler(FacilityController.remove))
