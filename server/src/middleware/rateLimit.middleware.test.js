import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'

process.env.JWT_SECRET = 'test-only-secret-value-that-is-long-enough'
process.env.DATABASE_URL = 'postgresql://test/test'
process.env.LOG_LEVEL = 'silent'

const { loginLimiter, forgotPasswordLimiter, changePasswordLimiter } =
  await import('./rateLimit.middleware.js')
const { errorMiddleware } = await import('./error.middleware.js')

// Builds a throwaway app behind a proxy header, so the limiter has to resolve
// the client address the way it does in production.
const appWith = (limiter, hops = 2) => {
  const app = express()
  app.set('trust proxy', hops)
  app.post('/x', limiter, (req, res) => res.json({ ok: true, ip: req.ip }))
  app.use(errorMiddleware)
  return app
}

const hammer = async (app, count, forwardedFor) => {
  const results = []
  for (let i = 0; i < count; i += 1) {
    const req = request(app).post('/x')
    if (forwardedFor) req.set('X-Forwarded-For', forwardedFor)
    results.push((await req.send({})).status)
  }
  return results
}

describe('rate limiters key on the client address, not the proxy', () => {
  it('resolves req.ip from the forwarded chain', async () => {
    // The bug this guards: with trust proxy set to 1 hop against a two-proxy
    // chain, req.ip resolved to the shared upstream address, so one abusive
    // client consumed the login budget for every user at once.
    const res = await request(appWith(loginLimiter))
      .post('/x')
      .set('X-Forwarded-For', '203.0.113.9, 70.41.3.18')
      .send({})
    expect(res.body.ip).toBe('203.0.113.9')
  })

  it('does not let one client exhaust another client’s budget', async () => {
    const app = appWith(loginLimiter)
    const attacker = await hammer(app, 11, '198.51.100.7, 70.41.3.18')
    expect(attacker.filter((s) => s === 429).length).toBeGreaterThan(0)

    // A different client, arriving through the same proxy, is unaffected.
    const bystander = await hammer(app, 1, '203.0.113.42, 70.41.3.18')
    expect(bystander[0]).toBe(200)
  })
})

describe('auth limiters have independent budgets', () => {
  it('spending the forgot-password budget leaves change-password usable', async () => {
    // These five endpoints used to share one limiter instance, so a user who
    // changed their password twice could no longer confirm an email change.
    const forgot = appWith(forgotPasswordLimiter)
    const change = appWith(changePasswordLimiter)

    const spent = await hammer(forgot, 6, '192.0.2.5, 70.41.3.18')
    expect(spent[spent.length - 1]).toBe(429)

    const other = await hammer(change, 1, '192.0.2.5, 70.41.3.18')
    expect(other[0]).toBe(200)
  })
})

describe('limit responses', () => {
  it('returns 429 with a friendly message and standard headers', async () => {
    const app = appWith(loginLimiter)
    const responses = []
    for (let i = 0; i < 11; i += 1) {
      responses.push(
        await request(app)
          .post('/x')
          .set('X-Forwarded-For', '198.51.100.99, 70.41.3.18')
          .send({}),
      )
    }
    const limited = responses[responses.length - 1]
    expect(limited.status).toBe(429)
    expect(limited.body.error).toMatch(/too many/i)
    expect(
      limited.headers['ratelimit-policy'] ?? limited.headers['ratelimit'],
    ).toBeTruthy()
  })
})
