import { Router } from 'express'
import { prisma } from '../config/db.js'

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

export const healthRouter = Router()

// Liveness: is the process up and serving? Deliberately dependency-free, so a
// database blip does not cause the platform to restart a healthy process.
healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Readiness: can this instance actually serve requests? This is the one worth
// pointing a load balancer at.
healthRouter.get('/health/ready', async (req, res) => {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, DB_PROBE_TIMEOUT_MS)
    res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() })
  } catch (err) {
    res.status(503).json({
      status: 'unavailable',
      database: 'error',
      reason: err.message,
      time: new Date().toISOString(),
    })
  }
})
