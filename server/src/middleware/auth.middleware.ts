import type { NextFunction, Request, Response } from 'express'
import type { PortalRole } from '@prisma/client'
import { ApiError } from '../utils/ApiError.js'
import { verifyToken, type AuthTokenPayload } from '../services/auth.service.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing or malformed Authorization header'))
    return
  }

  try {
    req.auth = verifyToken(header.slice('Bearer '.length))
    next()
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'))
  }
}

export function requireRole(...roles: PortalRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(ApiError.unauthorized())
      return
    }
    if (!roles.includes(req.auth.role)) {
      next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`))
      return
    }
    next()
  }
}
