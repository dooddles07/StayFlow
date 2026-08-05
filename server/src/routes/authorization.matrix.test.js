import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The whole point of this suite is to exercise the REAL router table and the
// REAL guard chain over HTTP. Mocking at the controller level would prove
// nothing about which middleware a route is actually wired with — and a route
// missing a guard is exactly the bug class this file exists to catch.
//
// It was written alongside making buildCrudRouter's role lists mandatory. That
// change replaced a silent pass-through default with an explicit list on five
// routers, and this matrix is the evidence that the explicit lists reproduce
// the previous allow/deny behaviour rather than quietly widening or narrowing
// access.

const JWT_SECRET = 'test-only-secret-value-that-is-long-enough'
process.env.JWT_SECRET = JWT_SECRET
process.env.DATABASE_URL = 'postgresql://test/test'
process.env.NODE_ENV = 'test'
// Hundreds of requests go through the real app here; the access log would bury
// the assertions.
process.env.LOG_LEVEL = 'silent'

// A permissive Prisma stand-in. Every delegate answers, so an authorised
// request reaches its controller and returns a success status instead of
// blowing up on an undefined model — which would make "not 403" meaningless.
const record = (extra = {}) => ({
  id: 'rec-1',
  residentId: 'resident-1',
  hostResidentId: 'resident-1',
  staffId: 'staff-1',
  status: 'PENDING',
  // EventModel.findById always selects rsvps, and the RSVP controller reads
  // event.rsvps directly. Omitting it here produces a 500 that exists only in
  // the mock.
  rsvps: [],
  capacity: 50,
  ...extra,
})

const delegate = () => ({
  findMany: vi.fn(async () => []),
  findUnique: vi.fn(async () => record()),
  findFirst: vi.fn(async () => null),
  create: vi.fn(async () => record()),
  update: vi.fn(async () => record()),
  updateMany: vi.fn(async () => ({ count: 0 })),
  delete: vi.fn(async () => record()),
  count: vi.fn(async () => 0),
})

vi.mock('../config/db.js', () => {
  const models = [
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
    'appNotification',
    'user',
    'authEvent',
    'adminActionEvent',
  ]
  const prisma = Object.fromEntries(models.map((m) => [m, delegate()]))
  prisma.$transaction = vi.fn(async (arg) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
  )
  prisma.$queryRaw = vi.fn(async () => [{ '?column?': 1 }])
  prisma.$connect = vi.fn()
  prisma.$disconnect = vi.fn()
  return { prisma }
})

// Rate limiters are stubbed out here only. 250+ matrix requests share one client
// IP and would trip the 300/15min apiLimiter partway through, turning real
// results into 429 noise. Limiter behaviour is covered separately in
// rateLimit.middleware.test.js.
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
    uploadSignatureLimiter: pass,
  }
})

vi.mock('../models/user.model.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    UserModel: {
      ...actual.UserModel,
      findAuthState: vi.fn(),
      findById: vi.fn(async () => ({
        id: 'user-1',
        email: 'a@b.io',
        role: 'MEMBER',
      })),
      revokeSessions: vi.fn(async () => ({})),
    },
  }
})

const { UserModel } = await import('../models/user.model.js')
const { default: app } = await import('../app.js')

const IDENTITY = {
  MEMBER: { sub: 'user-member', residentId: 'resident-1', staffId: null },
  STAFF: { sub: 'user-staff', residentId: null, staffId: 'staff-1' },
  MANAGEMENT: { sub: 'user-mgmt', residentId: null, staffId: null },
}

const tokenFor = (role) =>
  jwt.sign(
    {
      ...IDENTITY[role],
      email: `${role.toLowerCase()}@stayflow.io`,
      role,
      tokenVersion: 1,
      mustChangePassword: false,
    },
    JWT_SECRET,
  )

const call = (method, path, role) => {
  // The agent is held in its own binding rather than chained off request(app):
  // prettier wraps `request(app)[method](path)` onto a second line, and a line
  // starting with `[` is an ASI hazard that no-unexpected-multiline rejects.
  const agent = request(app)
  const req = agent[method](path).set(
    'Authorization',
    `Bearer ${tokenFor(role)}`,
  )
  return method === 'get' || method === 'delete' ? req : req.send({})
}

const ROLES = ['MEMBER', 'STAFF', 'MANAGEMENT']

/**
 * Each entry lists the roles allowed through the guard chain. Assertions are
 * written as "403 or not 403" rather than exact success codes: a permitted
 * request may still legitimately 400/404/409 on its body or on mock data, and
 * pinning those here would make the file a change-detector instead of an
 * authorisation contract.
 */
const MATRIX = [
  // Shared property information — open to every signed-in role by design.
  // These five routers are the ones that used to reach this state by omitting
  // readRoles entirely; the expectations below are unchanged from that
  // behaviour, now enforced by an explicit list.
  ['get', '/api/facilities', ROLES],
  ['get', '/api/facilities/f-1', ROLES],
  ['get', '/api/restaurants', ROLES],
  ['get', '/api/restaurants/r-1', ROLES],
  ['get', '/api/tables', ROLES],
  ['get', '/api/tables/t-1', ROLES],
  ['get', '/api/tables/restaurant/r-1', ROLES],
  ['get', '/api/notices', ROLES],
  ['get', '/api/notices/n-1', ROLES],
  ['get', '/api/events', ROLES],
  ['get', '/api/events/e-1', ROLES],
  ['get', '/api/bookings/facility/f-1', ROLES],

  // Writes on that same shared information are management-only.
  ['post', '/api/restaurants', ['MANAGEMENT']],
  ['put', '/api/restaurants/r-1', ['MANAGEMENT']],
  ['delete', '/api/restaurants/r-1', ['MANAGEMENT']],
  ['post', '/api/tables', ['MANAGEMENT']],
  ['delete', '/api/tables/t-1', ['MANAGEMENT']],
  ['post', '/api/notices', ['MANAGEMENT']],
  ['delete', '/api/notices/n-1', ['MANAGEMENT']],
  ['post', '/api/events', ['MANAGEMENT']],
  ['delete', '/api/events/e-1', ['MANAGEMENT']],
  // Facilities are the one resource front-desk staff may edit.
  ['post', '/api/facilities', ['STAFF', 'MANAGEMENT']],
  ['put', '/api/facilities/f-1', ['STAFF', 'MANAGEMENT']],
  ['delete', '/api/facilities/f-1', ['STAFF', 'MANAGEMENT']],

  // Operational lists hold resident PII — never open to members.
  ['get', '/api/residents', ['STAFF', 'MANAGEMENT']],
  ['get', '/api/residents/res-1', ['STAFF', 'MANAGEMENT']],
  ['get', '/api/staff', ['STAFF', 'MANAGEMENT']],
  ['get', '/api/bookings', ['STAFF', 'MANAGEMENT']],
  ['get', '/api/dining-reservations', ['STAFF', 'MANAGEMENT']],
  ['get', '/api/guests', ['STAFF', 'MANAGEMENT']],
  ['get', '/api/notifications', ['STAFF', 'MANAGEMENT']],

  // Resident records are management-only to mutate; issuing a login more so.
  ['post', '/api/residents', ['MANAGEMENT']],
  ['put', '/api/residents/res-1', ['MANAGEMENT']],
  ['delete', '/api/residents/res-1', ['MANAGEMENT']],
  ['post', '/api/residents/res-1/create-login', ['MANAGEMENT']],
  ['post', '/api/staff', ['MANAGEMENT']],
  ['delete', '/api/staff/s-1', ['MANAGEMENT']],

  // Front-desk actions.
  ['put', '/api/bookings/b-1', ['STAFF', 'MANAGEMENT']],
  ['put', '/api/dining-reservations/d-1', ['STAFF', 'MANAGEMENT']],
  ['post', '/api/guests/g-1/check-in', ['STAFF', 'MANAGEMENT']],
  ['post', '/api/guests/g-1/check-out', ['STAFF', 'MANAGEMENT']],
  ['post', '/api/notifications', ['STAFF', 'MANAGEMENT']],
  ['post', '/api/notifications/read-all', ['MANAGEMENT']],

  // A signature is a write credential for the shared Cloudinary folder, and only
  // MANAGEMENT edits the resources that carry a photo.
  ['post', '/api/uploads/signature', ['MANAGEMENT']],

  // Self-service: any authenticated caller, scoped to their own record inside.
  ['get', '/api/residents/me', ROLES],
  ['post', '/api/bookings', ROLES],
  ['post', '/api/dining-reservations', ROLES],
  ['post', '/api/guests', ROLES],
  ['post', '/api/events/e-1/rsvp', ROLES],
]

describe('route authorization matrix', () => {
  beforeEach(() => {
    UserModel.findAuthState.mockReset()
    UserModel.findAuthState.mockImplementation(async (id) => ({
      id,
      tokenVersion: 1,
      isActive: true,
    }))
  })

  for (const [method, path, allowed] of MATRIX) {
    for (const role of ROLES) {
      const permitted = allowed.includes(role)
      it(`${permitted ? 'allows' : 'denies'} ${role} ${method.toUpperCase()} ${path}`, async () => {
        const res = await call(method, path, role)
        if (permitted) {
          expect(res.status, `${role} should not be forbidden`).not.toBe(403)
        } else {
          expect(res.status, `${role} should be forbidden`).toBe(403)
        }
      })
    }
  }
})

describe('authentication is required', () => {
  beforeEach(() => {
    UserModel.findAuthState.mockReset()
    UserModel.findAuthState.mockImplementation(async (id) => ({
      id,
      tokenVersion: 1,
      isActive: true,
    }))
  })

  it.each([
    ['get', '/api/residents'],
    ['get', '/api/facilities'],
    ['get', '/api/notifications'],
    ['post', '/api/bookings'],
    ['post', '/api/auth/logout'],
  ])('rejects an unauthenticated %s %s', async (method, path) => {
    const res = await request(app)[method](path).send({})
    expect(res.status).toBe(401)
  })

  it('rejects a token whose tokenVersion has been revoked', async () => {
    // What logout now does: bump tokenVersion so an already-issued bearer token
    // stops working immediately instead of staying valid for its full 7 days.
    UserModel.findAuthState.mockImplementation(async (id) => ({
      id,
      tokenVersion: 99,
      isActive: true,
    }))
    const res = await call('get', '/api/facilities', 'MANAGEMENT')
    expect(res.status).toBe(401)
  })

  it('rejects a token for a deactivated user', async () => {
    UserModel.findAuthState.mockImplementation(async (id) => ({
      id,
      tokenVersion: 1,
      isActive: false,
    }))
    const res = await call('get', '/api/facilities', 'MANAGEMENT')
    expect(res.status).toBe(401)
  })
})
