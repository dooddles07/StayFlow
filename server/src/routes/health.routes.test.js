import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

process.env.JWT_SECRET = 'test-only-secret-value-that-is-long-enough'
process.env.DATABASE_URL = 'postgresql://test/test'
process.env.DIRECT_URL = 'postgresql://test/test'
process.env.LOG_LEVEL = 'silent'

vi.mock('../config/db.js', () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) },
}))

const { prisma } = await import('../config/db.js')
const { healthRouter } = await import('./health.routes.js')

const app = express()
app.use('/api', healthRouter)

beforeEach(() => {
  prisma.$queryRaw.mockClear()
})

// Order matters: only a healthy probe is cached, so the failure cases run
// first, while nothing is cached yet.
describe('readiness probe', () => {
  it('never returns the underlying failure to the caller', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(
      new Error(
        "Can't reach database server at `ep-secret-host.neon.tech:5432`",
      ),
    )

    const res = await request(app).get('/api/health/ready')

    expect(res.status).toBe(503)
    expect(JSON.stringify(res.body)).not.toContain('neon.tech')
    expect(res.body.database).toBe('error')
  })

  it('retries immediately after a failure so recovery is not delayed', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'))
    await request(app).get('/api/health/ready')

    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])
    const res = await request(app).get('/api/health/ready')

    expect(res.status).toBe(200)
  })

  // The route sits ahead of the rate limiter so the platform can always reach
  // it, which also means anyone who knows the origin URL can. Without the cache
  // that is one database connection per request against a free-tier instance.
  it('reuses a healthy result instead of querying on every request', async () => {
    await request(app).get('/api/health/ready')
    await request(app).get('/api/health/ready')

    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })
})

describe('liveness probe', () => {
  it('answers without touching the database', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })
})
