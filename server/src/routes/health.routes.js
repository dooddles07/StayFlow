import { Router } from 'express'
import { prisma } from '../config/db.js'
import { logger } from '../utils/logger.js'

// A health check that always returns ok is worse than none: Render kept an
// instance with a dead database connection in rotation because the old handler
// never touched a dependency. The probe is bounded so a hung database produces
// a fast 503 rather than a hung health check.
const DB_PROBE_TIMEOUT_MS = 2_000

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`timed out after ${ms}ms`)),
        ms,
      ).unref(),
    ),
  ])

// The probe runs a query, and this route sits ahead of the rate limiter so the
// platform can always reach it. Without a cache, anyone who knows the origin
// URL could open a connection per request against a free-tier database. One
// probe every few seconds is more than enough resolution for a health check.
//
// Only a healthy result is cached. A failure is retried on the next request so
// readiness recovers the moment the database does, and a database that is down
// has no capacity left to protect anyway.
// Overridable so a test can assert the uncached behaviour, and so the window
// can be shortened from config if a platform ever probes less forgivingly.
const PROBE_CACHE_MS = Number(process.env.HEALTH_PROBE_CACHE_MS ?? 5_000)
let healthyUntil = 0

const probeDatabase = async () => {
  if (Date.now() < healthyUntil) return true

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_PROBE_TIMEOUT_MS)
    healthyUntil = Date.now() + PROBE_CACHE_MS
    return true
  } catch (err) {
    // The real reason names the database host and user, so it stays in the log
    // where an operator can read it and out of an unauthenticated response.
    healthyUntil = 0
    logger.error('health.database_unavailable', { message: err.message })
    return false
  }
}

export const healthRouter = Router()

// Liveness: is the process up and serving? Deliberately dependency-free, so a
// database blip does not cause the platform to restart a healthy process.
healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Readiness: can this instance actually serve requests? This is the one worth
// pointing a load balancer at.
healthRouter.get('/health/ready', async (req, res) => {
  if (await probeDatabase()) {
    return res.json({
      status: 'ok',
      database: 'ok',
      time: new Date().toISOString(),
    })
  }
  res.status(503).json({
    status: 'unavailable',
    database: 'error',
    time: new Date().toISOString(),
  })
})
