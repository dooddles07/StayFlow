import { Router } from 'express'
import { notificationController } from '../controllers/notification.controller.js'
import { NotificationModel } from '../models/notification.model.js'
import {
  requireOwnNotification,
  requireOwnResidentParam,
  requireOwnStaffParam,
  requireRole,
} from '../middleware/auth.middleware.js'
import {
  validateBody,
  validateQuery,
} from '../middleware/validate.middleware.js'
import {
  notificationCreateSchema,
  notificationListQuerySchema,
} from '../schemas/notification.schema.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownNotification = requireOwnNotification(NotificationModel)
const validateListQuery = validateQuery(notificationListQuerySchema)

const router = Router()
router.get('/', staffOnly, validateListQuery, notificationController.list)
router.get(
  '/resident/:residentId',
  requireOwnResidentParam(),
  validateListQuery,
  notificationController.byResident,
)
router.get(
  '/staff/:staffId',
  requireOwnStaffParam(),
  validateListQuery,
  notificationController.byStaff,
)
router.post(
  '/',
  staffOnly,
  validateBody(notificationCreateSchema),
  notificationController.create,
)
router.post('/:id/read', ownNotification, notificationController.markRead)
router.post(
  '/resident/:residentId/read-all',
  requireOwnResidentParam(),
  notificationController.markAllRead,
)
router.post(
  '/staff/:staffId/read-all',
  requireOwnStaffParam(),
  notificationController.markAllReadStaff,
)
router.post(
  '/read-all',
  requireRole('MANAGEMENT'),
  notificationController.markAllReadGlobal,
)
// staffOnly alone let any STAFF user delete any resident's or any peer's
// notification. Both guards are kept rather than swapped: staffOnly preserves
// the existing "members cannot delete" rule, ownNotification adds the ownership
// check every sibling route on this model already had.
router.delete('/:id', staffOnly, ownNotification, notificationController.remove)

export default router
