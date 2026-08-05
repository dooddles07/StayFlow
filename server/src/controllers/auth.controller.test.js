import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TEST_JWT_SECRET,
  as,
  createPrismaMock,
  createRateLimitMock,
  setTestEnv,
} from '../test-support/api-harness.js'

setTestEnv()

const prismaMock = createPrismaMock()
vi.mock('../config/db.js', () => ({ prisma: prismaMock }))
vi.mock('../middleware/rateLimit.middleware.js', () => createRateLimitMock())
vi.mock('../utils/mailer.js', () => ({
  deliverResetToken: vi.fn(async () => {}),
  deliverEmailChange: vi.fn(async () => {}),
}))

const { prisma } = await import('../config/db.js')
const mailer = await import('../utils/mailer.js')
const { default: app } = await import('../app.js')

const PASSWORD = 'correct-horse-battery'
// One real bcrypt hash for the whole file: hashing at cost 12 is deliberately
// slow, and every case needs the same one.
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4)

const user = (over = {}) => ({
  id: 'user-1',
  email: 'resident@stayflow.io',
  role: 'MEMBER',
  passwordHash: PASSWORD_HASH,
  tokenVersion: 1,
  isActive: true,
  failedLoginCount: 0,
  lockedUntil: null,
  mustChangePassword: false,
  residentId: 'resident-1',
  staffId: null,
  pendingEmail: null,
  resetTokenHash: null,
  resetTokenExpiresAt: null,
  emailTokenHash: null,
  emailTokenExpiresAt: null,
  ...over,
})

const login = (body) => request(app).post('/api/auth/login').send(body)

const cookieFrom = (res) => String(res.headers['set-cookie'] ?? '')

beforeEach(() => {
  vi.clearAllMocks()
  prisma.user.findUnique.mockResolvedValue(user())
  prisma.user.update.mockImplementation(async ({ where, data }) => ({
    ...user(),
    id: where.id,
    ...data,
  }))
  mailer.deliverResetToken.mockResolvedValue(undefined)
  mailer.deliverEmailChange.mockResolvedValue(undefined)
})

describe('POST /api/auth/login', () => {
  it('signs in with the right password', async () => {
    const res = await login({
      email: 'resident@stayflow.io',
      password: PASSWORD,
    })

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('resident@stayflow.io')
  })

  // httpOnly is the whole point: a token in the JSON body is readable by any
  // script on the page, which is exactly what the cookie flag prevents.
  it('delivers the token only as an httpOnly cookie', async () => {
    const res = await login({
      email: 'resident@stayflow.io',
      password: PASSWORD,
    })

    expect(cookieFrom(res)).toMatch(/stayflow_token=.+/)
    expect(cookieFrom(res)).toMatch(/HttpOnly/i)
    expect(JSON.stringify(res.body)).not.toMatch(/eyJ/)
  })

  it('never returns the password hash or the auth bookkeeping', async () => {
    const res = await login({
      email: 'resident@stayflow.io',
      password: PASSWORD,
    })
    const body = JSON.stringify(res.body)

    for (const field of [
      'passwordHash',
      'tokenVersion',
      'failedLoginCount',
      'lockedUntil',
      'resetTokenHash',
    ]) {
      expect(body).not.toContain(field)
    }
  })

  it('carries the role and linked ids in the token, not the request', async () => {
    const res = await login({
      email: 'resident@stayflow.io',
      password: PASSWORD,
    })
    const token = cookieFrom(res).match(/stayflow_token=([^;]+)/)[1]

    const payload = jwt.verify(decodeURIComponent(token), TEST_JWT_SECRET)
    expect(payload).toMatchObject({
      sub: 'user-1',
      role: 'MEMBER',
      residentId: 'resident-1',
      tokenVersion: 1,
    })
  })

  it('rejects a wrong password', async () => {
    const res = await login({
      email: 'resident@stayflow.io',
      password: 'wrong-password',
    })

    expect(res.status).toBe(401)
    expect(cookieFrom(res)).not.toMatch(/stayflow_token=\S/)
  })

  // The same message and status for both, so a caller cannot use the response
  // to learn which addresses have accounts.
  it('answers an unknown email exactly like a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const unknown = await login({
      email: 'nobody@stayflow.io',
      password: PASSWORD,
    })
    prisma.user.findUnique.mockResolvedValue(user())
    const wrong = await login({
      email: 'resident@stayflow.io',
      password: 'wrong-password',
    })

    expect(unknown.status).toBe(wrong.status)
    expect(unknown.body).toEqual(wrong.body)
  })

  it('requires both fields', async () => {
    expect((await login({ email: 'resident@stayflow.io' })).status).toBe(400)
    expect((await login({ password: PASSWORD })).status).toBe(400)
  })
})

describe('POST /api/auth/login — lockout', () => {
  it('counts a failure toward the lock', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ failedLoginCount: 2 }))

    await login({ email: 'resident@stayflow.io', password: 'wrong-password' })

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: 3, lockedUntil: null },
      }),
    )
  })

  it('locks the account on the fifth consecutive failure', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ failedLoginCount: 4 }))

    await login({ email: 'resident@stayflow.io', password: 'wrong-password' })

    const { data } = prisma.user.update.mock.calls[0][0]
    expect(data.failedLoginCount).toBe(0)
    expect(data.lockedUntil).toBeInstanceOf(Date)
    expect(data.lockedUntil.getTime()).toBeGreaterThan(Date.now())
  })

  // Per-account, so rotating source addresses does not help — that is the gap
  // the per-IP limiter cannot cover on its own.
  it('turns away a locked account even with the right password', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({ lockedUntil: new Date(Date.now() + 60_000) }),
    )

    const res = await login({
      email: 'resident@stayflow.io',
      password: PASSWORD,
    })

    expect(res.status).toBe(429)
    expect(res.body.error).toMatch(/locked/i)
  })

  it('lets a lapsed lock through', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({ lockedUntil: new Date(Date.now() - 60_000) }),
    )

    const res = await login({
      email: 'resident@stayflow.io',
      password: PASSWORD,
    })

    expect(res.status).toBe(200)
  })

  it('clears the failure count after a good sign-in', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ failedLoginCount: 3 }))

    await login({ email: 'resident@stayflow.io', password: PASSWORD })

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { failedLoginCount: 0, lockedUntil: null },
      }),
    )
  })

  // Only ever revealed to someone who already proved they own the account.
  it('tells a disabled account why, but only after the password checks out', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ isActive: false }))

    const right = await login({
      email: 'resident@stayflow.io',
      password: PASSWORD,
    })
    const wrong = await login({
      email: 'resident@stayflow.io',
      password: 'wrong-password',
    })

    expect(right.status).toBe(403)
    expect(right.body.error).toMatch(/disabled/i)
    expect(wrong.status).toBe(401)
    expect(wrong.body.error).not.toMatch(/disabled/i)
  })
})

describe('POST /api/auth/logout', () => {
  it('revokes every token already issued for the account', async () => {
    const res = await as(request(app).post('/api/auth/logout'), 'MEMBER').send(
      {},
    )

    expect(res.status).toBe(204)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tokenVersion: { increment: 1 } } }),
    )
  })

  it('clears the cookie', async () => {
    const res = await as(request(app).post('/api/auth/logout'), 'MEMBER').send(
      {},
    )
    expect(cookieFrom(res)).toContain('stayflow_token=;')
  })

  it('refuses an unauthenticated call, so the audit row can name a user', async () => {
    expect((await request(app).post('/api/auth/logout').send({})).status).toBe(
      401,
    )
  })
})

describe('POST /api/auth/forgot-password', () => {
  const forgot = (email) =>
    request(app).post('/api/auth/forgot-password').send({ email })

  it('answers the same whether or not the account exists', async () => {
    const known = await forgot('resident@stayflow.io')
    prisma.user.findUnique.mockResolvedValue(null)
    const unknown = await forgot('nobody@stayflow.io')

    expect(known.status).toBe(200)
    expect(unknown.status).toBe(200)
    expect(known.body).toEqual(unknown.body)
  })

  it('stores only a hash of the token, never the token', async () => {
    await forgot('resident@stayflow.io')

    const { data } = prisma.user.update.mock.calls[0][0]
    expect(data.resetTokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(data.resetTokenExpiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('sends nothing for an address with no account', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await forgot('nobody@stayflow.io')

    expect(mailer.deliverResetToken).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  // A delivery failure that changed the response would leak account existence,
  // and awaiting the provider would hold an unauthenticated request open.
  it('keeps the same answer when delivery fails', async () => {
    mailer.deliverResetToken.mockRejectedValue(new Error('provider down'))

    const res = await forgot('resident@stayflow.io')

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/if an account exists/i)
  })
})

describe('POST /api/auth/reset-password', () => {
  const reset = (body) =>
    request(app).post('/api/auth/reset-password').send(body)

  const withValidToken = () =>
    prisma.user.findUnique.mockResolvedValue(
      user({
        resetTokenHash: 'stored-hash',
        resetTokenExpiresAt: new Date(Date.now() + 60_000),
      }),
    )

  it('sets the new password and signs every session out', async () => {
    withValidToken()

    const res = await reset({ token: 'raw-token', password: 'a-new-password' })

    expect(res.status).toBe(200)
    const { data } = prisma.user.update.mock.calls[0][0]
    expect(data.tokenVersion).toEqual({ increment: 1 })
    expect(data.resetTokenHash).toBeNull()
    expect(data.lockedUntil).toBeNull()
    expect(data.mustChangePassword).toBe(false)
  })

  it('stores a hash, not the password', async () => {
    withValidToken()

    await reset({ token: 'raw-token', password: 'a-new-password' })

    const { data } = prisma.user.update.mock.calls[0][0]
    expect(data.passwordHash).not.toContain('a-new-password')
    expect(bcrypt.compareSync('a-new-password', data.passwordHash)).toBe(true)
  })

  it('looks the token up by its hash', async () => {
    withValidToken()

    await reset({ token: 'raw-token', password: 'a-new-password' })

    const lookup = prisma.user.findUnique.mock.calls[0][0]
    expect(lookup.where.resetTokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(lookup.where.resetTokenHash).not.toBe('raw-token')
  })

  it('refuses an expired token', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({
        resetTokenHash: 'stored-hash',
        resetTokenExpiresAt: new Date(Date.now() - 1),
      }),
    )

    const res = await reset({ token: 'raw-token', password: 'a-new-password' })

    expect(res.status).toBe(400)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('refuses a token nobody holds', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    expect(
      (await reset({ token: 'made-up', password: 'a-new-password' })).status,
    ).toBe(400)
  })

  it('still enforces the password policy', async () => {
    withValidToken()

    expect(
      (await reset({ token: 'raw-token', password: 'short' })).status,
    ).toBe(400)
    expect(
      (await reset({ token: 'raw-token', password: 'x'.repeat(73) })).status,
    ).toBe(400)
  })
})

describe('POST /api/auth/change-password', () => {
  const change = (body, role = 'MEMBER') =>
    as(request(app).post('/api/auth/change-password'), role).send(body)

  it('rotates the password and keeps this session signed in', async () => {
    const res = await change({
      currentPassword: PASSWORD,
      newPassword: 'a-new-password',
    })

    expect(res.status).toBe(200)
    expect(cookieFrom(res)).toMatch(/stayflow_token=.+/)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
      }),
    )
  })

  it('clears the forced-change flag', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ mustChangePassword: true }))

    await change({ currentPassword: PASSWORD, newPassword: 'a-new-password' })

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mustChangePassword: false }),
      }),
    )
  })

  it('refuses without the current password', async () => {
    const res = await change({
      currentPassword: 'wrong-password',
      newPassword: 'a-new-password',
    })

    expect(res.status).toBe(401)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('refuses reusing the current password', async () => {
    const res = await change({
      currentPassword: PASSWORD,
      newPassword: PASSWORD,
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/different/i)
  })

  it('refuses an unauthenticated call', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: 'a-new-password' })

    expect(res.status).toBe(401)
  })
})

// Verify-then-apply: nothing changes until the link sent to the NEW address is
// opened, so a typo cannot lock someone out of their own account.
describe('email change', () => {
  const requestChange = (body) =>
    as(request(app).post('/api/auth/change-email'), 'MEMBER').send(body)

  // findUnique serves every lookup here — the auth check, then the two
  // availability checks — so route them by their where clause rather than by
  // call order.
  const withEmailFree = () =>
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.email || where.pendingEmail ? null : user(),
    )

  it('sends a link to the new address without changing anything yet', async () => {
    withEmailFree()

    const res = await requestChange({
      newEmail: 'new@stayflow.io',
      currentPassword: PASSWORD,
    })

    expect(res.status).toBe(200)
    const { data } = prisma.user.update.mock.calls[0][0]
    expect(data.pendingEmail).toBe('new@stayflow.io')
    expect(data.email).toBeUndefined()
    expect(mailer.deliverEmailChange).toHaveBeenCalled()
  })

  it('refuses without the current password', async () => {
    const res = await requestChange({
      newEmail: 'new@stayflow.io',
      currentPassword: 'wrong-password',
    })

    expect(res.status).toBe(401)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('rejects a malformed address', async () => {
    const res = await requestChange({
      newEmail: 'not-an-email',
      currentPassword: PASSWORD,
    })
    expect(res.status).toBe(400)
  })

  it('rejects an address that is already the current one', async () => {
    const res = await requestChange({
      newEmail: 'resident@stayflow.io',
      currentPassword: PASSWORD,
    })
    expect(res.status).toBe(400)
  })

  it('rejects an address another account holds', async () => {
    prisma.user.findUnique.mockImplementation(async ({ where }) =>
      where.email ? user({ id: 'user-2' }) : where.pendingEmail ? null : user(),
    )

    const res = await requestChange({
      newEmail: 'taken@stayflow.io',
      currentPassword: PASSWORD,
    })

    expect(res.status).toBe(409)
  })

  it('applies the change when the link is opened', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({
        pendingEmail: 'new@stayflow.io',
        emailTokenHash: 'stored',
        emailTokenExpiresAt: new Date(Date.now() + 60_000),
      }),
    )

    const res = await request(app)
      .post('/api/auth/confirm-email')
      .send({ token: 'raw-token' })

    expect(res.status).toBe(200)
  })

  it('refuses an expired verification link', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({
        pendingEmail: 'new@stayflow.io',
        emailTokenHash: 'stored',
        emailTokenExpiresAt: new Date(Date.now() - 1),
      }),
    )

    const res = await request(app)
      .post('/api/auth/confirm-email')
      .send({ token: 'raw-token' })

    expect(res.status).toBe(400)
  })

  it('reports a race for the same address as a conflict, not a 500', async () => {
    prisma.user.findUnique.mockResolvedValue(
      user({
        pendingEmail: 'new@stayflow.io',
        emailTokenHash: 'stored',
        emailTokenExpiresAt: new Date(Date.now() + 60_000),
      }),
    )
    prisma.user.update.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    )

    const res = await request(app)
      .post('/api/auth/confirm-email')
      .send({ token: 'raw-token' })

    expect(res.status).toBe(409)
  })
})

describe('GET /api/auth/me', () => {
  it('returns the caller without any secret material', async () => {
    const res = await as(request(app).get('/api/auth/me'), 'MEMBER')

    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toContain('passwordHash')
  })

  it('refuses an unauthenticated call', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401)
  })

  // requireAuth compares the token's tokenVersion against the stored one, which
  // is how logout and a password change kill tokens already in the wild.
  it('rejects a token issued before the sessions were revoked', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ tokenVersion: 7 }))

    const res = await as(request(app).get('/api/auth/me'), 'MEMBER')

    expect(res.status).toBe(401)
  })

  it('rejects a token for a disabled account', async () => {
    prisma.user.findUnique.mockResolvedValue(user({ isActive: false }))

    const res = await as(request(app).get('/api/auth/me'), 'MEMBER')

    expect(res.status).toBe(401)
  })

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign(
      { sub: 'user-1', role: 'MANAGEMENT', tokenVersion: 1 },
      'not-the-real-secret-but-long-enough',
    )

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forged}`)

    expect(res.status).toBe(401)
  })
})
