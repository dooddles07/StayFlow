import { Router } from 'express'
import {
  changePassword,
  confirmEmailChange,
  forgotPassword,
  login,
  logout,
  me,
  requestEmailChange,
  resetPassword,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import {
  changeEmailLimiter,
  changePasswordLimiter,
  confirmEmailLimiter,
  forgotPasswordLimiter,
  loginLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimit.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import {
  changePasswordSchema,
  confirmEmailChangeSchema,
  forgotPasswordSchema,
  loginSchema,
  requestEmailChangeSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js'

const router = Router()

router.post('/login', loginLimiter, validateBody(loginSchema), login)
// requireAuth: logout now revokes the session server-side, which needs to know
// whose session it is. It also makes the LOGOUT audit row carry a real user id
// instead of the null it always recorded before.
router.post('/logout', requireAuth, logout)
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  forgotPassword,
)
router.post(
  '/reset-password',
  resetPasswordLimiter,
  validateBody(resetPasswordSchema),
  resetPassword,
)
router.get('/me', requireAuth, me)
router.post(
  '/change-password',
  requireAuth,
  changePasswordLimiter,
  validateBody(changePasswordSchema),
  changePassword,
)
router.post(
  '/change-email',
  requireAuth,
  changeEmailLimiter,
  validateBody(requestEmailChangeSchema),
  requestEmailChange,
)
router.post(
  '/confirm-email',
  confirmEmailLimiter,
  validateBody(confirmEmailChangeSchema),
  confirmEmailChange,
)

export default router
