import { Router } from 'express'
import * as EventController from '../controllers/event.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

export const eventRouter = Router()

eventRouter.use(requireAuth)
eventRouter.get('/', asyncHandler(EventController.list))
eventRouter.get('/:id', asyncHandler(EventController.getById))
eventRouter.post('/', requireRole('MANAGEMENT'), asyncHandler(EventController.create))
eventRouter.patch('/:id', requireRole('MANAGEMENT'), asyncHandler(EventController.update))
eventRouter.delete('/:id', requireRole('MANAGEMENT'), asyncHandler(EventController.remove))
eventRouter.post('/:id/rsvp', requireRole('MEMBER'), asyncHandler(EventController.rsvp))
