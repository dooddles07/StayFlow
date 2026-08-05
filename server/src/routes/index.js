import { Router } from 'express'
import {
  blockIfMustChangePassword,
  requireAuth,
} from '../middleware/auth.middleware.js'
import authRoutes from './auth.routes.js'
import residentRoutes from './resident.routes.js'
import staffRoutes from './staff.routes.js'
import facilityRoutes from './facility.routes.js'
import bookingRoutes from './booking.routes.js'
import restaurantRoutes from './restaurant.routes.js'
import tableRoutes from './table.routes.js'
import diningReservationRoutes from './diningReservation.routes.js'
import guestRoutes from './guest.routes.js'
import eventRoutes from './event.routes.js'
import noticeRoutes from './notice.routes.js'
import notificationRoutes from './notification.routes.js'
import uploadRoutes from './upload.routes.js'

const router = Router()

// /health and /health/ready live in health.routes.js, mounted ahead of the rate
// limiter and access log in app.js.

// /auth is deliberately NOT wrapped with blockIfMustChangePassword — a gated resident
// must still reach /auth/me, /auth/logout, /auth/change-password to complete the change.
router.use('/auth', authRoutes)
router.use('/residents', requireAuth, blockIfMustChangePassword, residentRoutes)
router.use('/staff', requireAuth, blockIfMustChangePassword, staffRoutes)
router.use(
  '/facilities',
  requireAuth,
  blockIfMustChangePassword,
  facilityRoutes,
)
router.use('/bookings', requireAuth, blockIfMustChangePassword, bookingRoutes)
router.use(
  '/restaurants',
  requireAuth,
  blockIfMustChangePassword,
  restaurantRoutes,
)
router.use('/tables', requireAuth, blockIfMustChangePassword, tableRoutes)
router.use(
  '/dining-reservations',
  requireAuth,
  blockIfMustChangePassword,
  diningReservationRoutes,
)
router.use('/guests', requireAuth, blockIfMustChangePassword, guestRoutes)
router.use('/events', requireAuth, blockIfMustChangePassword, eventRoutes)
router.use('/notices', requireAuth, blockIfMustChangePassword, noticeRoutes)
router.use(
  '/notifications',
  requireAuth,
  blockIfMustChangePassword,
  notificationRoutes,
)
router.use('/uploads', requireAuth, blockIfMustChangePassword, uploadRoutes)

export default router
