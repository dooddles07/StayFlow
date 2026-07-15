import { Router } from 'express'
import * as BookingController from '../controllers/booking.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export const bookingRouter = Router()

bookingRouter.use(requireAuth)
bookingRouter.get('/', asyncHandler(BookingController.list))
bookingRouter.post('/', asyncHandler(BookingController.create))
bookingRouter.patch('/:id/status', asyncHandler(BookingController.updateStatus))
