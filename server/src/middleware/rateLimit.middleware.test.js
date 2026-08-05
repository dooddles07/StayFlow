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
  app.use(express.json())
  app.post('/x', limiter, (req, res) => res.json({ ok: true, ip: req.ip }))
  app.use(errorMiddleware)
  return app
}

const hammer = async (app, count, forwardedFor, body = {}) => {
  const results = []
  for (let i = 0; i < count; i += 1) {
    const req = request(app).post('/x')
    if (forwardedFor) req.set('X-Forwarded-For', forwardedFor)
    results.push((await req.send(body)).status)
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

// The Render origin answers requests that never went through the Vercel edge,
// so X-Forwarded-For is caller-controlled on that path.
describe('forged proxy chains cannot mint fresh budgets', () => {
  it('buckets over-long forwarded chains together', async () => {
    const app = appWith(changePasswordLimiter)

    const spent = await hammer(app, 11, '1.1.1.1, 2.2.2.2, 9.9.9.9, 70.41.3.18')
    expect(spent[spent.length - 1]).toBe(429)

    // A different forged address on an equally implausible chain lands in the
    // same bucket rather than getting a clean 10-request budget.
    const rotated = await hammer(
      app,
      1,
      '8.8.8.8, 4.4.4.4, 9.9.9.9, 70.41.3.18',
    )
    expect(rotated[0]).toBe(429)
  })

  it('leaves a well-formed chain on its own per-address budget', async () => {
    const app = appWith(changePasswordLimiter)
    const honest = await hammer(app, 1, '203.0.113.77, 70.41.3.18')
    expect(honest[0]).toBe(200)
  })
})

describe('sensitive flows are keyed on identity, not address', () => {
  it('holds the login budget to the account even as the address rotates', async () => {
    const app = appWith(loginLimiter)
    const results = []
    for (let i = 0; i < 11; i += 1) {
      results.push(
        (
          await request(app)
            .post('/x')
            .set('X-Forwarded-For', `198.51.100.${i}, 70.41.3.18`)
            .send({ email: 'target@example.com' })
        ).status,
      )
    }
    expect(results[results.length - 1]).toBe(429)
  })

  it('keeps separate budgets per account from one address', async () => {
    const app = appWith(loginLimiter)
    const chain = '203.0.113.150, 70.41.3.18'

    const spent = await hammer(app, 11, chain, { email: 'a@example.com' })
    expect(spent[spent.length - 1]).toBe(429)

    const other = await hammer(app, 1, chain, { email: 'b@example.com' })
    expect(other[0]).toBe(200)
  })

  it('treats the same mailbox in different casing as one budget', async () => {
    const app = appWith(forgotPasswordLimiter)

    await hammer(app, 5, '192.0.2.60, 70.41.3.18', { email: 'Mix@Example.com' })
    const same = await hammer(app, 1, '192.0.2.61, 70.41.3.18', {
      email: 'mix@example.com',
    })
    expect(same[0]).toBe(429)
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
