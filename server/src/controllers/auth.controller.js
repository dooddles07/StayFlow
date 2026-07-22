import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UserModel } from '../models/user.model.js'
import { ResidentModel } from '../models/resident.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AuthEventType, logAuthEvent } from '../utils/authLog.js'
import { deliverEmailChange, deliverResetToken } from '../utils/mailer.js'

const signToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      residentId: user.residentId ?? null,
      staffId: user.staffId ?? null,
      tokenVersion: user.tokenVersion,
    },
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

const BCRYPT_ROUNDS = 12
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const EMAIL_TOKEN_TTL_MS = 60 * 60 * 1000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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

  // A residentId claims an existing profile — without proof of ownership, anyone
  // could link their new login to any resident's record just by guessing/enumerating
  // ids. Require the email to match the one already on file for that resident (set by
  // management when the profile was created). One generic message for "no such
  // resident" and "email doesn't match" alike, so this can't be used to enumerate
  // which resident ids exist.
  if (residentId) {
    const resident = await ResidentModel.findById(residentId)
    if (!resident || resident.email.toLowerCase() !== String(email).toLowerCase()) {
      throw ApiError.badRequest('That resident ID and email do not match our records.')
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
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
    // Swallow delivery failures: a send error must not flip the generic response and leak
    // whether the account exists. Log server-side and move on.
    try {
      await deliverResetToken(user, rawToken)
    } catch (err) {
      console.error('[password-reset] delivery failed:', err.message)
    }
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

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
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

// Step 1 of email change: authenticated user proves their password and names a new
// address. Nothing changes yet — a token goes to the NEW address to prove they own it.
export const requestEmailChange = asyncHandler(async (req, res) => {
  const { newEmail, currentPassword } = req.body
  if (!newEmail || !currentPassword) throw ApiError.badRequest('newEmail and currentPassword are required')
  const email = String(newEmail).trim().toLowerCase()
  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('Enter a valid email address')

  const user = await UserModel.findById(req.user.sub)
  if (!user) throw ApiError.notFound('User not found')
  if (email === user.email.toLowerCase()) throw ApiError.badRequest('That is already your email address')

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw ApiError.unauthorized('Current password is incorrect')

  const [emailTaken, pendingTaken] = await Promise.all([
    UserModel.findByEmail(email),
    UserModel.findByPendingEmail(email),
  ])
  if (emailTaken || (pendingTaken && pendingTaken.id !== user.id)) throw ApiError.conflict('That email is already in use')

  const rawToken = crypto.randomBytes(32).toString('hex')
  await UserModel.setEmailChangeToken(user.id, email, hashResetToken(rawToken), new Date(Date.now() + EMAIL_TOKEN_TTL_MS))
  try {
    await deliverEmailChange(user, email, rawToken)
  } catch (err) {
    console.error('[email-change] delivery failed:', err.message)
    throw ApiError.badRequest('Could not send the verification email. Try again shortly.')
  }
  logAuthEvent(req, AuthEventType.EMAIL_CHANGE_REQUEST, { userId: user.id, email: user.email })

  res.json({ message: `Verification link sent to ${email}. Open it to confirm the change.` })
})

// Step 2: the link (public, token-bearing) is opened. Apply the pending email and sign
// every session out — the login identity just changed.
export const confirmEmailChange = asyncHandler(async (req, res) => {
  const { token } = req.body
  if (!token) throw ApiError.badRequest('token is required')

  const user = await UserModel.findByEmailTokenHash(hashResetToken(token))
  if (!user || !user.pendingEmail || !user.emailTokenExpiresAt || user.emailTokenExpiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired verification link')
  }

  try {
    await UserModel.applyEmailChange(user)
  } catch (err) {
    if (err.code === 'P2002') throw ApiError.conflict('That email is already in use')
    throw err
  }
  logAuthEvent(req, AuthEventType.EMAIL_CHANGE_SUCCESS, { userId: user.id, email: user.pendingEmail })

  res.json({ message: 'Email updated. Please sign in with your new email address.' })
})

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) throw ApiError.badRequest('currentPassword and newPassword are required')
  assertValidPassword(newPassword)

  const user = await UserModel.findById(req.user.sub)
  if (!user) throw ApiError.notFound('User not found')

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    logAuthEvent(req, AuthEventType.PASSWORD_CHANGE, { userId: user.id, email: user.email, success: false })
    throw ApiError.unauthorized('Current password is incorrect')
  }

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw ApiError.badRequest('New password must be different from the current password')
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  const updated = await UserModel.applyPasswordChange(user.id, passwordHash)
  logAuthEvent(req, AuthEventType.PASSWORD_CHANGE, { userId: user.id, email: user.email })

  // tokenVersion bumped → all other sessions are now invalid. Re-issue a cookie
  // for THIS session so the user who just changed their password stays signed in.
  const token = signToken(updated)
  setAuthCookie(res, token)
  res.json({ message: 'Password updated. Other devices have been signed out.' })
})
