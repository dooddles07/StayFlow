import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Origins a browser may legitimately send state-changing requests from. APP_URL
// is the deployed frontend; CORS_ORIGIN covers any extra allowed frontend.
const allowedOrigins = new Set(
  [env.appUrl, ...env.corsOrigins]
    .filter((o) => o && o !== '*')
    .map((o) => o.replace(/\/$/, '')),
)

/**
 * CSRF defence in depth.
 *
 * The real protection today is SameSite=Lax on the auth cookie plus a JSON-only
 * body parser, which together already stop a cross-site form post. This adds a
 * second, independent layer so a single change (a future SameSite=None, an
 * added urlencoded parser) cannot silently remove all protection at once.
 *
 * Only requests that actually carry an Origin are judged. Browsers always send
 * one on a state-changing request; server-to-server callers (the SSR fetch in
 * src/lib/api/client.ts, curl, health probes) do not, and are not the threat
 * model here — an attacker's leverage in CSRF is the victim's browser attaching
 * the cookie automatically.
 */
export const originCheck = (req, res, next) => {
  if (!STATE_CHANGING.has(req.method)) return next()
  if (allowedOrigins.size === 0) return next()

  const origin = req.headers.origin
  if (!origin) return next()

  if (!allowedOrigins.has(origin.replace(/\/$/, ''))) {
    throw ApiError.forbidden('Request origin is not allowed')
  }
  next()
}
