import { env } from './env.js'

// Session cookie name and flags, defined once. The name used to be an
// independent string literal in both auth.controller.js and
// auth.middleware.js — changing one without the other would have signed every
// user out with no error anywhere to explain why.
export const AUTH_COOKIE = 'stayflow_token'

// httpOnly keeps the token out of JS (an XSS cannot read it), SameSite=lax
// blocks it on cross-site requests, Secure is enforced over https in production.
// maxAge matches the default JWT_EXPIRES_IN of 7d.
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}
