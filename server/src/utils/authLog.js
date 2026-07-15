import { AuthEventModel } from '../models/authEvent.model.js'

export const AuthEventType = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_LOCKED: 'LOGIN_LOCKED',
  LOGIN_DISABLED: 'LOGIN_DISABLED',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
}

/**
 * Records an auth event. Fire-and-forget: audit logging must never break or delay the
 * auth flow, so failures are swallowed (and surfaced to the server console only).
 */
export function logAuthEvent(req, type, { userId = null, email = null, success = true } = {}) {
  const ip = req.ip ?? null
  const userAgent = req.headers['user-agent'] ?? null
  AuthEventModel.record({ type, userId, email, ip, userAgent, success }).catch((err) => {
    console.error(`[audit] failed to record ${type}:`, err.message)
  })
}
