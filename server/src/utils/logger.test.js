import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

process.env.JWT_SECRET = 'test-only-secret-value-that-is-long-enough'
process.env.DATABASE_URL = 'postgresql://test/test'

// The logger is the last thing standing between a Prisma error object (which
// embeds query parameter values) or a request body and the log stream. If
// redaction regresses, credentials end up in log aggregation where they are
// durable and widely readable.

vi.mock('../config/env.js', () => ({ env: { isProd: true } }))

const { logger } = await import('./logger.js')

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

const lastLine = () => JSON.parse(written[written.length - 1])

describe('logger redaction', () => {
  it.each([
    'password',
    'passwordHash',
    'newPassword',
    'resetTokenHash',
    'emailTokenHash',
    'token',
    'jwtSecret',
    'authorization',
    'cookie',
    'apiKey',
    'api_key',
  ])('redacts %s', (key) => {
    logger.info('test.event', { [key]: 'super-secret-value' })
    expect(written.join('')).not.toContain('super-secret-value')
    expect(lastLine()[key]).toBe('[redacted]')
  })

  it('redacts nested values, such as a spread user row', () => {
    logger.error('test.event', {
      user: { id: 'u1', email: 'a@b.io', passwordHash: 'super-secret-value' },
    })
    expect(written.join('')).not.toContain('super-secret-value')
    expect(lastLine().user.passwordHash).toBe('[redacted]')
    // Non-sensitive fields survive, or the log would be useless.
    expect(lastLine().user.id).toBe('u1')
  })

  it('redacts inside arrays', () => {
    logger.warn('test.event', { items: [{ token: 'super-secret-value' }] })
    expect(written.join('')).not.toContain('super-secret-value')
  })

  it('emits one JSON object per line in production', () => {
    logger.info('http.request', { status: 200 })
    const line = written[written.length - 1]
    expect(line.endsWith('\n')).toBe(true)
    expect(() => JSON.parse(line)).not.toThrow()
    expect(lastLine()).toMatchObject({
      level: 'info',
      event: 'http.request',
      status: 200,
    })
    expect(lastLine().time).toBeTruthy()
  })

  it('sends errors to stderr', () => {
    logger.error('bad.thing', {})
    expect(process.stderr.write).toHaveBeenCalled()
  })
})
