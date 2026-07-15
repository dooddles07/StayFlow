import { Router } from 'express'
import * as StaffController from '../controllers/staff.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

export const staffRouter = Router()

staffRouter.use(requireAuth, requireRole('STAFF', 'MANAGEMENT'))
staffRouter.get('/', asyncHandler(StaffController.list))
staffRouter.get('/:id', asyncHandler(StaffController.getById))
staffRouter.post('/', requireRole('MANAGEMENT'), asyncHandler(StaffController.create))
staffRouter.patch('/:id', requireRole('MANAGEMENT'), asyncHandler(StaffController.update))
staffRouter.delete('/:id', requireRole('MANAGEMENT'), asyncHandler(StaffController.remove))
