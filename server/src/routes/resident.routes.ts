import { Router } from 'express'
import * as ResidentController from '../controllers/resident.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

export const residentRouter = Router()

residentRouter.use(requireAuth)
residentRouter.get('/', asyncHandler(ResidentController.list))
residentRouter.get('/:id', asyncHandler(ResidentController.getById))
residentRouter.post('/', requireRole('MANAGEMENT'), asyncHandler(ResidentController.create))
residentRouter.patch('/:id', asyncHandler(ResidentController.update))
residentRouter.delete('/:id', requireRole('MANAGEMENT'), asyncHandler(ResidentController.remove))
