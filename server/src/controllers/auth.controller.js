import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UserModel } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AuthEventType, logAuthEvent } from '../utils/authLog.js'
import { deliverResetToken } from '../utils/mailer.js'

const signToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role, residentId: user.residentId ?? null, tokenVersion: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )

export const AUTH_COOKIE = 'stayflow_token'

// Matches the default JWT_EXPIRES_IN of 7d. httpOnly keeps the token out of JS (XSS can't read it),
// SameSite=lax blocks it on cross-site requests, Secure enforced in production (https).
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

const setAuthCookie = (res, token) => res.cookie(AUTH_COOKIE, token, cookieOptions)

// Lock an account for LOCK_DURATION after LOCK_THRESHOLD consecutive failed logins.
// Per-account (survives IP rotation) — defends credential stuffing the per-IP limiter can't.
const LOCK_THRESHOLD = 5
const LOCK_DURATION_MS = 15 * 60 * 1000

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const MIN_PASSWORD_LENGTH = 8
// bcrypt silently truncates input past 72 bytes — reject longer so the stored hash matches what the user typed.
const MAX_PASSWORD_LENGTH = 72
const hashResetToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex')

const assertValidPassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw ApiError.badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
    throw ApiError.badRequest(`Password must be at most ${MAX_PASSWORD_LENGTH} bytes`)
  }
}

// Strip password hash and all internal auth bookkeeping from API responses.
const sanitize = (user) => {
  const { passwordHash, tokenVersion, failedLoginCount, lockedUntil, resetTokenHash, resetTokenExpiresAt, ...rest } = user
  return rest
}

export const register = asyncHandler(async (req, res) => {
  const { email, password, displayName, residentId } = req.body
  if (!email || !password || !displayName) {
    throw ApiError.badRequest('email, password, displayName are required')
  }
  assertValidPassword(password)

  const existing = await UserModel.findByEmail(email)
  if (existing) throw ApiError.conflict('Email already registered')

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await UserModel.create({ email, passwordHash, role: 'MEMBER', displayName, residentId })
  logAuthEvent(req, AuthEventType.REGISTER, { userId: user.id, email: user.email })
  const token = signToken(user)
  setAuthCookie(res, token)
  res.status(201).json({ token, user: sanitize(user) })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) throw ApiError.badRequest('email and password are required')

  const user = await UserModel.findByEmail(email)
  if (!user) {
    logAuthEvent(req, AuthEventType.LOGIN_FAILED, { email, success: false })
    throw ApiError.unauthorized('Invalid credentials')
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    logAuthEvent(req, AuthEventType.LOGIN_LOCKED, { userId: user.id, email: user.email, success: false })
    throw ApiError.tooManyRequests('Account temporarily locked after repeated failed logins. Try again later.')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const count = user.failedLoginCount + 1
    const locked = count >= LOCK_THRESHOLD
    await UserModel.setLoginState(user.id, {
      failedLoginCount: locked ? 0 : count,
      lockedUntil: locked ? new Date(Date.now() + LOCK_DURATION_MS) : null,
    })
    logAuthEvent(req, locked ? AuthEventType.LOGIN_LOCKED : AuthEventType.LOGIN_FAILED, {
      userId: user.id,
      email: user.email,
      success: false,
    })
    throw ApiError.unauthorized('Invalid credentials')
  }

  // Disabled accounts: only revealed to someone who already has the correct password (the legit owner).
  if (!user.isActive) {
    logAuthEvent(req, AuthEventType.LOGIN_DISABLED, { userId: user.id, email: user.email, success: false })
    throw ApiError.forbidden('This account has been disabled. Contact your administrator.')
  }

  if (user.failedLoginCount > 0 || user.lockedUntil) {
    await UserModel.setLoginState(user.id, { failedLoginCount: 0, lockedUntil: null })
  }

  logAuthEvent(req, AuthEventType.LOGIN_SUCCESS, { userId: user.id, email: user.email })
  const token = signToken(user)
  setAuthCookie(res, token)
  res.json({ token, user: sanitize(user) })
})

export const logout = asyncHandler(async (req, res) => {
  logAuthEvent(req, AuthEventType.LOGOUT)
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined })
  res.status(204).send()
})

const GENERIC_RESET_RESPONSE = { message: 'If an account exists for that email, a password reset link has been sent.' }

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  if (!email) throw ApiError.badRequest('email is required')

  const user = await UserModel.findByEmail(email)
  // Only act when the account exists, but always return the same response to prevent enumeration.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex')
    await UserModel.setResetToken(user.id, hashResetToken(rawToken), new Date(Date.now() + RESET_TOKEN_TTL_MS))
    await deliverResetToken(user, rawToken)
  }
  logAuthEvent(req, AuthEventType.PASSWORD_RESET_REQUEST, { userId: user?.id ?? null, email })

  res.json(GENERIC_RESET_RESPONSE)
})

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) throw ApiError.badRequest('token and password are required')
  assertValidPassword(password)

  const user = await UserModel.findByResetTokenHash(hashResetToken(token))
  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired reset token')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await UserModel.applyPasswordReset(user.id, passwordHash)
  logAuthEvent(req, AuthEventType.PASSWORD_RESET_SUCCESS, { userId: user.id, email: user.email })
  // tokenVersion was bumped, so any existing sessions are now revoked — user must sign in again.
  res.json({ message: 'Password updated. Please sign in with your new password.' })
})

export const me = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.user.sub)
  if (!user) throw ApiError.notFound('User not found')
  res.json(sanitize(user))
})
