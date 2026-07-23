import rateLimit from 'express-rate-limit'
import { ApiError } from '../utils/ApiError.js'

const handler = (req, res, next) => next(ApiError.tooManyRequests('Too many attempts. Try again later.'))

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
})

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
})

// MANAGEMENT-only, already authenticated — the threat here isn't anonymous brute-force
// (that's what the two limiters above defend against) but a compromised/malicious admin
// session mass-minting credentials. Ceiling set well above realistic front-desk bulk
// onboarding (a batch of new residents in one sitting) while still bounding runaway abuse.
export const createLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
})
