import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

process.env.JWT_SECRET = 'test-only-secret-value-that-is-long-enough'
process.env.DATABASE_URL = 'postgresql://test/test'

vi.mock('../config/env.js', () => ({ env: { isProd: true } }))

const { errorMiddleware, notFoundMiddleware } =
  await import('./error.middleware.js')

let written = []
beforeEach(() => {
  written = []
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    written.push(String(chunk))
    return true
  })
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    written.push(String(chunk))
    return true
  })
})
afterEach(() => vi.restoreAllMocks())

const req = { id: 'req-1', method: 'POST', originalUrl: '/api/residents' }

const invoke = (err) => {
  let status = null
  let body = null
  const res = {
    status(code) {
      status = code
      return this
    },
    json(payload) {
      body = payload
      return this
    },
  }
  errorMiddleware(err, req, res, () => {})
  return { status, body, logged: written.join('') }
}

// Prisma embeds the failing query's argument values inside `.message` and
// `.stack`. Those arguments are residents' emails, names and phone numbers, and
// a log aggregator is a durable, widely readable place for them to end up.
describe('errorMiddleware Prisma redaction', () => {
  it('keeps Prisma error text out of the log stream', () => {
    const err = new Error(
      'Invalid `prisma.resident.create()` invocation: email: "resident@example.com", phone: "+63 917 555 0101"',
    )
    err.name = 'PrismaClientValidationError'

    const { status, body, logged } = invoke(err)

    expect(logged).not.toContain('resident@example.com')
    expect(logged).not.toContain('+63 917 555 0101')
    expect(status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error', requestId: 'req-1' })
  })

  it('keeps the error code and offending columns, which carry no values', () => {
    const err = new Error('Unique constraint failed on the fields: (`email`)')
    err.name = 'PrismaClientKnownRequestError'
    err.code = 'P2014'
    err.meta = { target: ['email'] }

    const { logged } = invoke(err)
    const line = JSON.parse(logged.trim().split('\n').pop())

    expect(line.code).toBe('P2014')
    expect(line.target).toEqual(['email'])
  })

  it('still logs message and stack for non-Prisma errors', () => {
    const err = new Error('something broke in a route handler')

    const { logged } = invoke(err)
    const line = JSON.parse(logged.trim().split('\n').pop())

    expect(line.message).toBe('something broke in a route handler')
    expect(line.stack).toBeTruthy()
  })

  it('never returns internal detail to the caller', () => {
    const err = new Error('connect ECONNREFUSED 10.0.0.4:5432')

    const { body } = invoke(err)

    expect(JSON.stringify(body)).not.toContain('10.0.0.4')
  })
})

describe('notFoundMiddleware', () => {
  it('answers 404 without touching the error path', () => {
    let status = null
    let body = null
    const res = {
      status(code) {
        status = code
        return this
      },
      json(payload) {
        body = payload
        return this
      },
    }
    notFoundMiddleware({ method: 'GET', originalUrl: '/api/nope' }, res)

    expect(status).toBe(404)
    expect(body.error).toContain('/api/nope')
  })
})
