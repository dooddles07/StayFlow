import { randomUUID } from 'node:crypto'
import { logger } from '../utils/logger.js'

// Attaches a correlation id to every request and echoes it back. A user
// reporting "it failed at 3pm" is otherwise unfindable in the logs, because
// nothing tied their response to the server-side error that produced it.
export const requestId = (req, res, next) => {
  // Honour an upstream id when the proxy already assigned one, so a single
  // request keeps one id across Vercel and Render.
  const incoming = req.headers['x-request-id']
  req.id =
    typeof incoming === 'string' && incoming.length <= 200
      ? incoming
      : randomUUID()
  res.setHeader('X-Request-Id', req.id)
  next()
}

// Replaces morgan('dev'). Logs once on response finish so status and duration
// are known, and includes the fields an access log is actually used for.
export const accessLog = (req, res, next) => {
  const startedAt = process.hrtime.bigint()
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
    logger.info('http.request', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: req.ip,
      userId: req.user?.sub,
      role: req.user?.role,
    })
  })
  next()
}
