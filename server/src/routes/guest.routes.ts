import { Router } from 'express'
import * as GuestController from '../controllers/guest.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export const guestRouter = Router()

guestRouter.use(requireAuth)
guestRouter.get('/', asyncHandler(GuestController.list))
guestRouter.get('/pass/:passNumber', asyncHandler(GuestController.lookupByPass))
guestRouter.post('/', asyncHandler(GuestController.create))
guestRouter.patch('/:id/status', asyncHandler(GuestController.updateStatus))
