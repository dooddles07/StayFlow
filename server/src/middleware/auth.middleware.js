import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UserModel } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const AUTH_COOKIE = 'stayflow_token'

const readCookie = (req, name) => {
  const raw = req.headers.cookie
  if (!raw) return null
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim())
  }
  return null
}

const extractToken = (req) => {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) return header.slice('Bearer '.length)
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

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('Insufficient role')
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

export const requireOwnerRecord =
  (model, ownerField = 'residentId') =>
  async (req, res, next) => {
    if (req.user.role !== 'MEMBER') return next()
    const record = await model.findById(req.params.id)
    if (!record) throw ApiError.notFound('Not found')
    if (record[ownerField] !== req.user.residentId) {
      throw ApiError.forbidden('Not allowed to access this record')
    }
    next()
  }
