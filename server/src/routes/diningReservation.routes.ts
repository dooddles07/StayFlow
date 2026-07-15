import { Router } from 'express'
import * as DiningReservationController from '../controllers/diningReservation.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export const diningReservationRouter = Router()

diningReservationRouter.use(requireAuth)
diningReservationRouter.get('/', asyncHandler(DiningReservationController.list))
diningReservationRouter.post('/', asyncHandler(DiningReservationController.create))
diningReservationRouter.patch('/:id/status', asyncHandler(DiningReservationController.updateStatus))
