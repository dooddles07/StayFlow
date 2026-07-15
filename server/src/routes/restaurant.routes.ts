import { Router } from 'express'
import * as RestaurantController from '../controllers/restaurant.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

export const restaurantRouter = Router()

restaurantRouter.use(requireAuth)
restaurantRouter.get('/', asyncHandler(RestaurantController.list))
restaurantRouter.get('/:id', asyncHandler(RestaurantController.getById))
restaurantRouter.post('/', requireRole('MANAGEMENT'), asyncHandler(RestaurantController.create))
restaurantRouter.patch('/:id', requireRole('MANAGEMENT'), asyncHandler(RestaurantController.update))
restaurantRouter.delete('/:id', requireRole('MANAGEMENT'), asyncHandler(RestaurantController.remove))
