import { Router } from 'express'
import * as NotificationController from '../controllers/notification.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export const notificationRouter = Router()

notificationRouter.use(requireAuth)
notificationRouter.get('/', asyncHandler(NotificationController.list))
notificationRouter.patch('/:id/read', asyncHandler(NotificationController.markRead))
notificationRouter.patch('/read-all', asyncHandler(NotificationController.markAllRead))
