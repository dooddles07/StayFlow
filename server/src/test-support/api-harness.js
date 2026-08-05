import jwt from 'jsonwebtoken'
import { vi } from 'vitest'

// Shared scaffolding for the controller tests. Each of them drives the real
// Express app over HTTP with Prisma replaced, so routing, guards, validation
// and the error middleware are all exercised — the parts most likely to be
// wrong are the ones between the request and the controller, not inside it.

export const TEST_JWT_SECRET = 'test-only-secret-value-that-is-long-enough'

// Called before importing the app, so config/env.js sees a complete environment
// whether or not a developer has a .env file.
export function setTestEnv() {
  process.env.JWT_SECRET = TEST_JWT_SECRET
  process.env.DATABASE_URL = 'postgresql://test/test'
  process.env.DIRECT_URL = 'postgresql://test/test'
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'silent'
}

const MODELS = [
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

const delegate = () => ({
  findMany: vi.fn(async () => []),
  findUnique: vi.fn(async () => null),
  findFirst: vi.fn(async () => null),
  count: vi.fn(async () => 0),
  create: vi.fn(async (args) => ({ id: 'created-1', ...args?.data })),
  update: vi.fn(async (args) => ({ id: args?.where?.id, ...args?.data })),
  updateMany: vi.fn(async () => ({ count: 0 })),
  upsert: vi.fn(async (args) => ({ id: 'upserted-1', ...args?.create })),
  delete: vi.fn(async (args) => ({ id: args?.where?.id })),
  deleteMany: vi.fn(async () => ({ count: 0 })),
})

/** Prisma stand-in covering every model the app touches. */
export function createPrismaMock() {
  const prisma = Object.fromEntries(MODELS.map((m) => [m, delegate()]))
  // Callback form runs against the same mock, so a controller's transactional
  // path is exercised rather than skipped.
  prisma.$transaction = vi.fn(async (arg) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
  )
  prisma.$queryRaw = vi.fn(async () => [{ ok: 1 }])
  prisma.$executeRaw = vi.fn(async () => 0)
  return prisma
}

/** Rate limiters replaced with pass-throughs; they have their own test file. */
export function createRateLimitMock() {
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
}

export function signToken(role, over = {}) {
  return jwt.sign(
    {
      sub: `user-${role}`,
      email: `${role.toLowerCase()}@stayflow.io`,
      role,
      residentId: role === 'MEMBER' ? 'resident-1' : null,
      staffId: role === 'STAFF' ? 'staff-1' : null,
      tokenVersion: 1,
      mustChangePassword: false,
      ...over,
    },
    TEST_JWT_SECRET,
  )
}

/** Attaches a bearer token for the given role to a supertest request. */
export const as = (req, role, over) =>
  req.set('Authorization', `Bearer ${signToken(role, over)}`)
