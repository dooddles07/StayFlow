import { AuthEventModel } from '../models/authEvent.model.js'
import { logger } from './logger.js'

export const AuthEventType = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_LOCKED: 'LOGIN_LOCKED',
  LOGIN_DISABLED: 'LOGIN_DISABLED',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  EMAIL_CHANGE_REQUEST: 'EMAIL_CHANGE_REQUEST',
  EMAIL_CHANGE_SUCCESS: 'EMAIL_CHANGE_SUCCESS',
}

/**
 * Records an auth event. Fire-and-forget: audit logging must never break or delay the
 * auth flow, so failures are not rethrown — but they are logged at error level,
 * because a security audit trail with silent gaps is worse than no trail at all.
 */
export function logAuthEvent(
  req,
  type,
  { userId = null, email = null, success = true } = {},
) {
  const ip = req.ip ?? null
  const userAgent = req.headers['user-agent'] ?? null
  AuthEventModel.record({ type, userId, email, ip, userAgent, success }).catch(
    (err) => {
      logger.error('audit.auth_event_write_failed', {
        requestId: req.id,
        type,
        userId,
        message: err.message,
      })
    },
  )
}
