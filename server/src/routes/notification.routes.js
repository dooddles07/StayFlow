import { Router } from 'express'
import { notificationController } from '../controllers/notification.controller.js'
import { NotificationModel } from '../models/notification.model.js'
import { requireOwnNotification, requireOwnResidentParam, requireOwnStaffParam, requireRole } from '../middleware/auth.middleware.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownNotification = requireOwnNotification(NotificationModel)

const router = Router()
router.get('/', staffOnly, notificationController.list)
router.get('/resident/:residentId', requireOwnResidentParam(), notificationController.byResident)
router.get('/staff/:staffId', requireOwnStaffParam(), notificationController.byStaff)
router.post('/', staffOnly, notificationController.create)
router.post('/:id/read', ownNotification, notificationController.markRead)
router.post('/resident/:residentId/read-all', requireOwnResidentParam(), notificationController.markAllRead)
router.post('/staff/:staffId/read-all', requireOwnStaffParam(), notificationController.markAllReadStaff)
router.post('/read-all', requireRole('MANAGEMENT'), notificationController.markAllReadGlobal)
router.delete('/:id', staffOnly, notificationController.remove)

export default router
