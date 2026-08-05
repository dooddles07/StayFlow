import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// One test per defect fixed in the production-readiness pass. Each asserts the
// behaviour that was wrong, so a regression fails here rather than in
// production.

const JWT_SECRET = 'test-only-secret-value-that-is-long-enough'
process.env.JWT_SECRET = JWT_SECRET
process.env.DATABASE_URL = 'postgresql://test/test'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'silent'

const notification = (over = {}) => ({
  id: 'notif-1',
  residentId: 'resident-1',
  staffId: null,
  read: false,
  ...over,
})

const state = { notification: notification() }

vi.mock('../config/db.js', () => {
  const del = () => ({
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => ({ id: 'x' })),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: 'x' })),
    update: vi.fn(async () => ({ id: 'x' })),
    updateMany: vi.fn(async () => ({ count: 0 })),
    delete: vi.fn(async () => ({ id: 'x' })),
  })
  const prisma = Object.fromEntries(
    [
      'resident',
      'familyMember',
      'vehicle',
      'staffMember',
      'facility',
      'booking',
      'restaurant',
      'diningTable',
      'diningReservation',
      'guest',
      'communityEvent',
      'eventRsvp',
      'notice',
      'user',
      'authEvent',
      'adminActionEvent',
    ].map((m) => [m, del()]),
  )
  prisma.appNotification = {
    ...del(),
    findUnique: vi.fn(async () => state.notification),
    findMany: vi.fn(async () => []),
  }
  prisma.$transaction = vi.fn(async (a) =>
    typeof a === 'function' ? a(prisma) : Promise.all(a),
  )
  prisma.$queryRaw = vi.fn(async () => [{ ok: 1 }])
  return { prisma }
})

vi.mock('../middleware/rateLimit.middleware.js', () => {
  const pass = (req, res, next) => next()
  return {
    apiLimiter: pass,
    loginLimiter: pass,
    forgotPasswordLimiter: pass,
    resetPasswordLimiter: pass,
    changePasswordLimiter: pass,
    changeEmailLimiter: pass,
    confirmEmailLimiter: pass,
    createLoginLimiter: pass,
  }
})

vi.mock('../models/user.model.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    UserModel: {
      ...actual.UserModel,
      findAuthState: vi.fn(async (id) => ({
        id,
        tokenVersion: 1,
        isActive: true,
      })),
      revokeSessions: vi.fn(async () => ({})),
    },
  }
})

const { UserModel } = await import('../models/user.model.js')
const { prisma } = await import('../config/db.js')
const { default: app } = await import('../app.js')

const token = (role, over = {}) =>
  jwt.sign(
    {
      sub: `user-${role}`,
      email: `${role}@stayflow.io`,
      role,
      residentId: role === 'MEMBER' ? 'resident-1' : null,
      staffId: role === 'STAFF' ? 'staff-1' : null,
      tokenVersion: 1,
      mustChangePassword: false,
      ...over,
    },
    JWT_SECRET,
  )

const auth = (req, role, over) =>
  req.set('Authorization', `Bearer ${token(role, over)}`)

beforeEach(() => {
  state.notification = notification()
  vi.clearAllMocks()
  UserModel.findAuthState.mockImplementation(async (id) => ({
    id,
    tokenVersion: 1,
    isActive: true,
  }))
})

describe('H5 — query parameters are validated, not passed raw to Prisma', () => {
  it('rejects a non-numeric limit with 400 instead of throwing a 500', async () => {
    // Number('abc') is NaN; Math.min(NaN, 500) is NaN; Prisma take: NaN threw
    // into the unmapped-500 branch.
    const res = await auth(
      request(app).get('/api/notifications?limit=abc'),
      'MANAGEMENT',
    )
    expect(res.status).toBe(400)
  })

  it.each(['0', '-5', '99999', '1.5'])(
    'rejects out-of-range limit %s',
    async (limit) => {
      const res = await auth(
        request(app).get(`/api/notifications?limit=${limit}`),
        'MANAGEMENT',
      )
      expect(res.status).toBe(400)
    },
  )

  it('accepts a valid limit', async () => {
    const res = await auth(
      request(app).get('/api/notifications?limit=25'),
      'MANAGEMENT',
    )
    expect(res.status).toBe(200)
  })
})

describe('C4 — notification delete is owner-scoped', () => {
  it('stops a staff member deleting a notification they do not own', async () => {
    state.notification = notification({
      residentId: null,
      staffId: 'someone-else',
    })
    const res = await auth(
      request(app).delete('/api/notifications/notif-1'),
      'STAFF',
    )
    expect(res.status).toBe(403)
    expect(prisma.appNotification.delete).not.toHaveBeenCalled()
  })

  it("stops a staff member deleting a resident's notification", async () => {
    state.notification = notification({
      residentId: 'resident-9',
      staffId: null,
    })
    const res = await auth(
      request(app).delete('/api/notifications/notif-1'),
      'STAFF',
    )
    expect(res.status).toBe(403)
  })

  it('allows a staff member to delete their own notification', async () => {
    state.notification = notification({ residentId: null, staffId: 'staff-1' })
    const res = await auth(
      request(app).delete('/api/notifications/notif-1'),
      'STAFF',
    )
    expect(res.status).toBe(204)
  })

  it('still refuses members outright', async () => {
    const res = await auth(
      request(app).delete('/api/notifications/notif-1'),
      'MEMBER',
    )
    expect(res.status).toBe(403)
  })
})

describe('H3 — logout revokes the session server-side', () => {
  it('bumps tokenVersion so an already-issued token stops working', async () => {
    const res = await auth(
      request(app).post('/api/auth/logout'),
      'MANAGEMENT',
    ).send({})
    expect(res.status).toBe(204)
    expect(UserModel.revokeSessions).toHaveBeenCalledWith('user-MANAGEMENT')
  })

  it('clears the auth cookie', async () => {
    const res = await auth(
      request(app).post('/api/auth/logout'),
      'MEMBER',
    ).send({})
    expect(String(res.headers['set-cookie'])).toContain('stayflow_token=;')
  })

  it('requires authentication, so the audit row can name a user', async () => {
    const res = await request(app).post('/api/auth/logout').send({})
    expect(res.status).toBe(401)
  })
})

describe('H6 — error responses do not leak schema internals', () => {
  it('returns a generic message on a unique-constraint violation', async () => {
    prisma.facility.create.mockRejectedValueOnce(
      Object.assign(new Error('dup'), {
        code: 'P2002',
        meta: { target: ['secret_column_name'] },
      }),
    )
    const res = await auth(
      request(app).post('/api/facilities'),
      'MANAGEMENT',
    ).send({
      name: 'Pool',
      category: 'Leisure',
      description: 'd',
      rules: [],
      image: 'i',
      capacity: 5,
      openHours: '9-5',
      rating: 4,
      location: 'L2',
    })
    expect(res.status).toBe(409)
    expect(JSON.stringify(res.body)).not.toContain('secret_column_name')
  })

  it('returns a request id on an unhandled error so support can trace it', async () => {
    prisma.facility.findMany.mockRejectedValueOnce(new Error('boom'))
    const res = await auth(request(app).get('/api/facilities'), 'MEMBER')
    expect(res.status).toBe(500)
    expect(res.body.requestId).toBeTruthy()
    expect(res.body.error).toBe('Internal server error')
    // The underlying failure must not travel to the client.
    expect(JSON.stringify(res.body)).not.toContain('boom')
  })
})

describe('M7 — every response carries a correlation id', () => {
  it('sets X-Request-Id', async () => {
    const res = await auth(request(app).get('/api/facilities'), 'MEMBER')
    expect(res.headers['x-request-id']).toMatch(/[0-9a-f-]{36}/)
  })

  it('honours an upstream request id', async () => {
    const res = await auth(request(app).get('/api/facilities'), 'MEMBER').set(
      'X-Request-Id',
      'upstream-123',
    )
    expect(res.headers['x-request-id']).toBe('upstream-123')
  })
})

describe('M4 — health checks', () => {
  it('reports liveness without touching the database', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('probes the database for readiness', async () => {
    const res = await request(app).get('/api/health/ready')
    expect(res.status).toBe(200)
    expect(res.body.database).toBe('ok')
    expect(prisma.$queryRaw).toHaveBeenCalled()
  })

  it('reports 503 when the database is unreachable', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'))
    const res = await request(app).get('/api/health/ready')
    expect(res.status).toBe(503)
    expect(res.body.status).toBe('unavailable')
  })

  it('needs no authentication', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200)
  })
})

describe('M3 — Origin is checked on state-changing requests', () => {
  it('rejects a write from an unknown origin', async () => {
    const res = await auth(request(app).post('/api/facilities'), 'MANAGEMENT')
      .set('Origin', 'https://attacker.example')
      .send({})
    expect(res.status).toBe(403)
  })

  it('leaves reads alone regardless of origin', async () => {
    const res = await auth(request(app).get('/api/facilities'), 'MEMBER').set(
      'Origin',
      'https://attacker.example',
    )
    expect(res.status).toBe(200)
  })

  it('allows a write with no Origin header (server-to-server, SSR)', async () => {
    const res = await auth(
      request(app).post('/api/facilities'),
      'MANAGEMENT',
    ).send({})
    expect(res.status).not.toBe(403)
  })
})

describe('C3 — buildCrudRouter refuses to build without explicit role lists', () => {
  it('throws rather than silently defaulting to open access', async () => {
    const { buildCrudRouter } = await import('../utils/crudRouter.js')
    const controller = {
      list: vi.fn(),
      getOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    }
    expect(() =>
      buildCrudRouter(controller, { writeRoles: ['MANAGEMENT'] }),
    ).toThrow(/readRoles/)
    expect(() =>
      buildCrudRouter(controller, { readRoles: ['MEMBER'] }),
    ).toThrow(/writeRoles/)
    expect(() =>
      buildCrudRouter(controller, {
        readRoles: ['NOPE'],
        writeRoles: ['MANAGEMENT'],
      }),
    ).toThrow(/unknown role/)
  })
})

describe('H7 — request bodies are bounded per route', () => {
  it('rejects an oversized body on a small-payload endpoint', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'a@b.io', password: 'x'.repeat(200_000) })
    expect(res.status).toBe(413)
  })
})

describe('M6 — sign-in email is case-insensitive', () => {
  it('normalises the address before looking it up', async () => {
    const { loginSchema } = await import('../schemas/auth.schema.js')
    expect(
      loginSchema.parse({ email: '  Ada@Example.COM ', password: 'x' }).email,
    ).toBe('ada@example.com')
  })

  it('rejects a malformed address', async () => {
    const { loginSchema } = await import('../schemas/auth.schema.js')
    expect(
      loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success,
    ).toBe(false)
  })
})
