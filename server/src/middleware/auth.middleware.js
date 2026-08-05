import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { assertKnownRoles } from '../config/roles.js'
import { UserModel } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

import { AUTH_COOKIE } from '../config/authCookie.js'

const readCookie = (req, name) => {
  const raw = req.headers.cookie
  if (!raw) return null
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

const extractToken = (req) => {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer '))
    return header.slice('Bearer '.length)
  return readCookie(req, AUTH_COOKIE)
}

export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req)
  if (!token) throw ApiError.unauthorized('Missing authentication token')
  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    throw ApiError.unauthorized('Invalid or expired token')
  }

  const user = await UserModel.findAuthState(payload.sub)
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Invalid or expired token')
  }

  req.user = payload
  next()
})

export const requireRole = (...roles) => {
  // Boot-time check: a typo'd role name would otherwise build a rule that can
  // never match, failing closed but silently and only for real users.
  assertKnownRoles(roles, 'requireRole')
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('Insufficient role')
    }
    next()
  }
}

// A resident with a MANAGEMENT-issued temp password can't touch anything else until
// they set their own — mounted on every non-auth resource router. /auth/me,
// /auth/logout, and /auth/change-password stay reachable (routes/index.js doesn't
// wrap /auth with this), which is exactly what's needed to complete the change.
export const blockIfMustChangePassword = (req, res, next) => {
  if (req.user?.mustChangePassword) {
    throw ApiError.forbidden(
      'You must change your temporary password before continuing.',
    )
  }
  next()
}

// STAFF/MANAGEMENT act on behalf of any resident; MEMBER only ever their own.
export const requireOwnResidentParam =
  (paramName = 'residentId') =>
  (req, res, next) => {
    if (req.user.role !== 'MEMBER') return next()
    if (req.params[paramName] !== req.user.residentId) {
      throw ApiError.forbidden("Not allowed to access this resident's data")
    }
    next()
  }

export const requireOwnResidentBody =
  (fieldName = 'residentId') =>
  (req, res, next) => {
    if (req.user.role !== 'MEMBER') return next()
    req.body[fieldName] = req.user.residentId
    next()
  }

// Stashes the record it fetches on req.record — a handler further down the chain
// (buildCrudController.getOne, dining reservation delete's own lookup) would
// otherwise re-fetch the exact same row by the exact same id a moment later.
// asyncHandler is not optional here: Express 4 does not catch a rejected promise
// from middleware, so a database failure inside this guard escapes as an
// unhandled rejection, which Node terminates the process on.
export const requireOwnerRecord = (model, ownerField = 'residentId') =>
  asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'MEMBER') return next()
    const record = await model.findById(req.params.id)
    if (!record) throw ApiError.notFound('Not found')
    if (record[ownerField] !== req.user.residentId) {
      throw ApiError.forbidden('Not allowed to access this record')
    }
    req.record = record
    next()
  })

// Unlike requireOwnResidentParam, this isn't "anyone but the owning role passes
// through" — a resident has no business reason to read staff notifications, and
// neither does a staff peer (the shared operational view is GET /notifications,
// already open to STAFF/MANAGEMENT). Only MANAGEMENT gets a free pass; STAFF must
// match their own id; everyone else is forbidden outright.
export const requireOwnStaffParam =
  (paramName = 'staffId') =>
  (req, res, next) => {
    if (req.user.role === 'MANAGEMENT') return next()
    if (req.user.role === 'STAFF' && req.params[paramName] === req.user.staffId)
      return next()
    throw ApiError.forbidden("Not allowed to access this staff member's data")
  }

// A notification is owned by whichever of residentId/staffId is set, matching the
// caller's own role — MEMBER checks residentId, STAFF checks staffId. MANAGEMENT
// (and any other caller) passes through untouched, same as requireOwnerRecord.
export const requireOwnNotification = (model) =>
  asyncHandler(async (req, res, next) => {
    if (req.user.role !== 'MEMBER' && req.user.role !== 'STAFF') return next()
    const record = await model.findById(req.params.id)
    if (!record) throw ApiError.notFound('Not found')
    const ownField = req.user.role === 'MEMBER' ? 'residentId' : 'staffId'
    const ownId =
      req.user.role === 'MEMBER' ? req.user.residentId : req.user.staffId
    if (record[ownField] !== ownId) {
      throw ApiError.forbidden('Not allowed to access this record')
    }
    next()
  })
