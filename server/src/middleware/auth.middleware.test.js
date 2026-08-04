import jwt from 'jsonwebtoken'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const JWT_SECRET = 'test-only-secret-value-that-is-long-enough'

vi.mock('../config/env.js', () => ({ env: { jwtSecret: JWT_SECRET } }))
vi.mock('../models/user.model.js', () => ({ UserModel: { findAuthState: vi.fn() } }))

const { UserModel } = await import('../models/user.model.js')
const { requireAuth, requireRole, blockIfMustChangePassword, requireOwnResidentParam } = await import('./auth.middleware.js')

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET)
}

function mockReqRes(overrides = {}) {
  return {
    req: { headers: {}, params: {}, body: {}, ...overrides },
    res: {},
    next: vi.fn(),
  }
}

// asyncHandler's wrapper (`Promise.resolve(fn()).catch(next)`) doesn't return its
// inner promise — Express never awaits middleware anyway — so `await requireAuth(...)`
// doesn't reliably wait for a mocked async UserModel call to settle. Flush a macrotask
// instead to guarantee any pending `.catch(next)` has run before asserting on `next`.
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('requireAuth', () => {
  beforeEach(() => {
    UserModel.findAuthState.mockReset()
  })

  it('rejects a request with no token', async () => {
    const { req, res, next } = mockReqRes()
    requireAuth(req, res, next)
    await flush()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })

  it('rejects an invalid/malformed token', async () => {
    const { req, res, next } = mockReqRes({ headers: { authorization: 'Bearer not-a-real-token' } })
    requireAuth(req, res, next)
    await flush()
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })

  it('rejects a valid token when the tokenVersion has been revoked', async () => {
    const token = signToken({ sub: 'user-1', tokenVersion: 1, role: 'MEMBER' })
    UserModel.findAuthState.mockResolvedValue({ id: 'user-1', isActive: true, tokenVersion: 2 })
    const { req, res, next } = mockReqRes({ headers: { authorization: `Bearer ${token}` } })
    requireAuth(req, res, next)
    await flush()
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })

  it('rejects a valid token for a deactivated user', async () => {
    const token = signToken({ sub: 'user-1', tokenVersion: 1, role: 'MEMBER' })
    UserModel.findAuthState.mockResolvedValue({ id: 'user-1', isActive: false, tokenVersion: 1 })
    const { req, res, next } = mockReqRes({ headers: { authorization: `Bearer ${token}` } })
    requireAuth(req, res, next)
    await flush()
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401 })
  })

  it('accepts a valid token and attaches req.user', async () => {
    const token = signToken({ sub: 'user-1', tokenVersion: 1, role: 'MEMBER' })
    UserModel.findAuthState.mockResolvedValue({ id: 'user-1', isActive: true, tokenVersion: 1 })
    const { req, res, next } = mockReqRes({ headers: { authorization: `Bearer ${token}` } })
    requireAuth(req, res, next)
    await flush()
    expect(next).toHaveBeenCalledWith()
    expect(req.user).toMatchObject({ sub: 'user-1', role: 'MEMBER' })
  })

  it('reads the token from a cookie when no Authorization header is present', async () => {
    const token = signToken({ sub: 'user-1', tokenVersion: 1, role: 'MEMBER' })
    UserModel.findAuthState.mockResolvedValue({ id: 'user-1', isActive: true, tokenVersion: 1 })
    const { req, res, next } = mockReqRes({ headers: { cookie: `stayflow_token=${token}` } })
    requireAuth(req, res, next)
    await flush()
    expect(next).toHaveBeenCalledWith()
  })
})

describe('requireRole', () => {
  it('throws 403 when the role is not allowed', () => {
    const { req } = mockReqRes()
    req.user = { role: 'MEMBER' }
    expect(() => requireRole('STAFF', 'MANAGEMENT')(req, {}, vi.fn())).toThrowError(expect.objectContaining({ statusCode: 403 }))
  })

  it('calls next when the role is allowed', () => {
    const { req, next } = mockReqRes()
    req.user = { role: 'MANAGEMENT' }
    requireRole('STAFF', 'MANAGEMENT')(req, {}, next)
    expect(next).toHaveBeenCalledWith()
  })
})

describe('blockIfMustChangePassword', () => {
  it('throws 403 when mustChangePassword is set', () => {
    const { req } = mockReqRes()
    req.user = { mustChangePassword: true }
    expect(() => blockIfMustChangePassword(req, {}, vi.fn())).toThrowError(expect.objectContaining({ statusCode: 403 }))
  })

  it('calls next when mustChangePassword is not set', () => {
    const { req, next } = mockReqRes()
    req.user = { mustChangePassword: false }
    blockIfMustChangePassword(req, {}, next)
    expect(next).toHaveBeenCalledWith()
  })
})

describe('requireOwnResidentParam', () => {
  it('lets STAFF/MANAGEMENT act on any resident', () => {
    const { req, next } = mockReqRes({ params: { residentId: 'res-other' } })
    req.user = { role: 'STAFF', residentId: 'res-1' }
    requireOwnResidentParam()(req, {}, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('forbids a MEMBER from accessing another resident', () => {
    const { req } = mockReqRes({ params: { residentId: 'res-other' } })
    req.user = { role: 'MEMBER', residentId: 'res-1' }
    expect(() => requireOwnResidentParam()(req, {}, vi.fn())).toThrowError(expect.objectContaining({ statusCode: 403 }))
  })

  it('allows a MEMBER to access their own resident record', () => {
    const { req, next } = mockReqRes({ params: { residentId: 'res-1' } })
    req.user = { role: 'MEMBER', residentId: 'res-1' }
    requireOwnResidentParam()(req, {}, next)
    expect(next).toHaveBeenCalledWith()
  })
})
