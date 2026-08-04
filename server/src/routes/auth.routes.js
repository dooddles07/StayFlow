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
import { loginLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware.js'
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
router.post('/logout', logout)
router.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', passwordResetLimiter, validateBody(resetPasswordSchema), resetPassword)
router.get('/me', requireAuth, me)
router.post('/change-password', requireAuth, passwordResetLimiter, validateBody(changePasswordSchema), changePassword)
router.post('/change-email', requireAuth, passwordResetLimiter, validateBody(requestEmailChangeSchema), requestEmailChange)
router.post('/confirm-email', passwordResetLimiter, validateBody(confirmEmailChangeSchema), confirmEmailChange)

export default router
