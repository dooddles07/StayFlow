import { ipKeyGenerator, default as rateLimit } from 'express-rate-limit'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

const handler = (req, res, next) => {
  logger.warn('ratelimit.exceeded', {
    requestId: req.id,
    path: req.originalUrl,
    ip: req.ip,
  })
  next(ApiError.tooManyRequests('Too many attempts. Try again later.'))
}

// Every limiter here is keyed on the client address, which is only correct if
// `trust proxy` matches the real number of proxies (see app.js). If proxy
// resolution ever fails, req.ip is undefined and the default key generator
// would bucket every caller together — one shared counter for the whole
// internet. Falling back to a per-request unique key fails open for rate
// limiting rather than locking out all users at once; the failure is logged so
// it cannot pass unnoticed.
const clientKey = (req) => {
  if (!req.ip) {
    logger.error('ratelimit.no_client_ip', { path: req.originalUrl })
    return `unresolved:${req.id ?? Math.random()}`
  }
  // Normalises IPv6 to a /56 subnet so a single client cannot rotate through
  // its own address space to reset the counter.
  return ipKeyGenerator(req.ip)
}

const build = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientKey,
    handler,
    ...options,
  })

const FIFTEEN_MIN = 15 * 60 * 1000
const ONE_HOUR = 60 * 60 * 1000

// Coarse ceiling on every /api request, on top of the route-specific limiters below.
// Those defend individual sensitive endpoints; this one bounds a single IP hammering
// the API in general (scripted scraping, a runaway client retry loop).
export const apiLimiter = build({ windowMs: FIFTEEN_MIN, limit: 300 })

export const loginLimiter = build({ windowMs: FIFTEEN_MIN, limit: 10 })

// One limiter instance per flow. A single shared instance meant the 5/hour
// budget was consumed jointly by forgot-password, reset-password,
// change-password, change-email and confirm-email — so a user who changed their
// password twice could no longer confirm an email change.

// Anonymous and abusable for enumeration or mail-bombing: keep it tight.
export const forgotPasswordLimiter = build({ windowMs: ONE_HOUR, limit: 5 })

// Completing a reset needs headroom for mistyped passwords that fail the
// strength check, and the token itself is already single-use and time-bounded.
export const resetPasswordLimiter = build({ windowMs: ONE_HOUR, limit: 10 })

// Authenticated flows. Still bounded (a stolen session should not be able to
// mass-mutate credentials) but not sharing a budget with the anonymous ones.
export const changePasswordLimiter = build({ windowMs: ONE_HOUR, limit: 10 })
export const changeEmailLimiter = build({ windowMs: ONE_HOUR, limit: 10 })
export const confirmEmailLimiter = build({ windowMs: ONE_HOUR, limit: 10 })

// MANAGEMENT-only, already authenticated — the threat here isn't anonymous brute-force
// (that's what the two limiters above defend against) but a compromised/malicious admin
// session mass-minting credentials. Ceiling set well above realistic front-desk bulk
// onboarding (a batch of new residents in one sitting) while still bounding runaway abuse.
export const createLoginLimiter = build({ windowMs: FIFTEEN_MIN, limit: 20 })

// Each signature is one free-tier Cloudinary upload someone else is paying for,
// so the ceiling is well below what a person editing photos by hand would need.
export const uploadSignatureLimiter = build({
  windowMs: FIFTEEN_MIN,
  limit: 30,
})
