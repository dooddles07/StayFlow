import { ipKeyGenerator, default as rateLimit } from 'express-rate-limit'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

// The Render origin is reachable without going through the Vercel edge, so a
// direct caller can prepend entries to X-Forwarded-For and choose whatever
// req.ip express reports. A request that took the intended path carries exactly
// as many entries as we have proxies; more than that means someone supplied
// their own, and per-IP keying is meaningless for it. Those requests share one
// bucket — strictly worse for the caller than the per-IP budget they were
// reaching for. A single forged entry still produces a plausible chain length,
// which is why the flows that matter are keyed on identity below rather than on
// an address at all.
const UNTRUSTED_CHAIN_KEY = 'untrusted-proxy-chain'

// Read from the app rather than recomputed, so this can never disagree with the
// `trust proxy` value app.js actually installed.
const expectedHops = (req) => {
  const setting = req.app?.get('trust proxy')
  if (typeof setting === 'number') return setting
  return Number(process.env.TRUST_PROXY_HOPS) || (env.isProd ? 2 : 1)
}

const forwardedHopCount = (req) => {
  const header = req.headers['x-forwarded-for']
  if (!header) return 0
  return String(header)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean).length
}

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
export const clientKey = (req) => {
  const hops = forwardedHopCount(req)
  const expected = expectedHops(req)
  if (hops > expected) {
    logger.warn('ratelimit.untrusted_proxy_chain', {
      path: req.originalUrl,
      hops,
      expected,
    })
    return UNTRUSTED_CHAIN_KEY
  }
  if (!req.ip) {
    logger.error('ratelimit.no_client_ip', { path: req.originalUrl })
    return `unresolved:${req.id ?? Math.random()}`
  }
  // Normalises IPv6 to a /56 subnet so a single client cannot rotate through
  // its own address space to reset the counter.
  return ipKeyGenerator(req.ip)
}

// An address is only as trustworthy as the proxy chain that reported it, so the
// flows worth protecting most are keyed on something the caller cannot rotate:
// the account they are acting on. A forged X-Forwarded-For buys nothing here.
const identityKey = (field) => (req) => {
  const value = req.body?.[field]
  if (typeof value === 'string' && value.trim()) {
    return `${field}:${value.trim().toLowerCase()}`
  }
  return clientKey(req)
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

export const loginLimiter = build({
  windowMs: FIFTEEN_MIN,
  limit: 10,
  keyGenerator: identityKey('email'),
})

// One limiter instance per flow. A single shared instance meant the 5/hour
// budget was consumed jointly by forgot-password, reset-password,
// change-password, change-email and confirm-email — so a user who changed their
// password twice could no longer confirm an email change.

// Anonymous and abusable for enumeration or mail-bombing: keep it tight, and
// key it on the mailbox so no amount of address rotation raises the ceiling.
export const forgotPasswordLimiter = build({
  windowMs: ONE_HOUR,
  limit: 5,
  keyGenerator: identityKey('email'),
})

// Completing a reset needs headroom for mistyped passwords that fail the
// strength check, and the token itself is already single-use and time-bounded.
export const resetPasswordLimiter = build({
  windowMs: ONE_HOUR,
  limit: 10,
  keyGenerator: identityKey('token'),
})

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
