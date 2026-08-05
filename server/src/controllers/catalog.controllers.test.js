import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  as,
  createPrismaMock,
  createRateLimitMock,
  setTestEnv,
} from '../test-support/api-harness.js'

setTestEnv()

const prismaMock = createPrismaMock()
vi.mock('../config/db.js', () => ({ prisma: prismaMock }))
vi.mock('../middleware/rateLimit.middleware.js', () => createRateLimitMock())
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
      findById: vi.fn(async () => ({
        id: 'user-1',
        displayName: 'Concierge Desk',
      })),
    },
  }
})

const { prisma } = await import('../config/db.js')
const { default: app } = await import('../app.js')

// Facility, restaurant, staff, table and notice are the same shape: allowlisted
// fields onto one model, guarded by role. One table drives them all so a new
// resource that forgets an allowlist stands out rather than blending in.
const RESOURCES = [
  {
    name: 'facility',
    path: '/api/facilities',
    model: 'facility',
    writer: 'STAFF',
    refused: 'MEMBER',
    valid: {
      name: 'Lap Pool',
      category: 'Leisure',
      description: '25m outdoor pool',
      rules: ['Shower first'],
      image: '/images/facilities/pool.webp',
      capacity: 30,
      openHours: '06:00-22:00',
      location: 'Level 5',
      rating: 4.8,
    },
    // Nothing here is a writable column: id and createdAt are the row's own,
    // and bookings is a relation a spread would try to overwrite.
    forbidden: { id: 'chosen', createdAt: '2020-01-01', bookings: [] },
  },
  {
    name: 'restaurant',
    path: '/api/restaurants',
    model: 'restaurant',
    writer: 'MANAGEMENT',
    refused: 'STAFF',
    valid: {
      name: 'Azure',
      cuisine: 'Mediterranean',
      description: 'Seafood and small plates',
      image: '/images/restaurants/azure.webp',
      openHours: '17:00-23:00',
      priceRange: '$$$',
      rating: 4.6,
      location: 'Level 2',
      maxPartySize: 8,
    },
    forbidden: { id: 'chosen', tables: [] },
  },
  {
    name: 'staff member',
    path: '/api/staff',
    model: 'staffMember',
    writer: 'MANAGEMENT',
    refused: 'STAFF',
    valid: {
      name: 'Dan Cruz',
      role: 'Facilities Manager',
      email: 'dan@stayflow.io',
      shift: 'Morning',
      avatarSeed: 'dan',
    },
    forbidden: { id: 'chosen', user: {} },
  },
  {
    name: 'dining table',
    path: '/api/tables',
    model: 'diningTable',
    writer: 'MANAGEMENT',
    refused: 'STAFF',
    valid: {
      restaurantId: 'rest-1',
      label: 'T12',
      seats: 4,
    },
    forbidden: { id: 'chosen', reservations: [] },
  },
  {
    name: 'notice',
    path: '/api/notices',
    model: 'notice',
    writer: 'MANAGEMENT',
    refused: 'STAFF',
    valid: {
      title: 'Lift maintenance',
      category: 'Maintenance',
      body: 'Lift B is out of service on Tuesday.',
    },
    forbidden: { id: 'chosen', postedAt: '2020-01-01' },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  for (const { model } of RESOURCES) {
    prisma[model].findUnique.mockResolvedValue({ id: 'row-1' })
    prisma[model].create.mockImplementation(async ({ data }) => ({
      id: 'row-1',
      ...data,
    }))
    prisma[model].update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      ...data,
    }))
  }
})

describe.each(RESOURCES)(
  '$name',
  ({ path, model, writer, refused, valid, forbidden }) => {
    const create = (body, role = writer) =>
      as(request(app).post(path), role).send(body)

    it('creates a row for an authorised writer', async () => {
      const res = await create(valid)

      expect(res.status).toBe(201)
      expect(prisma[model].create).toHaveBeenCalled()
    })

    it(`refuses a ${refused} writer`, async () => {
      const res = await create(valid, refused)

      expect(res.status).toBe(403)
      expect(prisma[model].create).not.toHaveBeenCalled()
    })

    it('refuses an unauthenticated writer', async () => {
      const res = await request(app).post(path).send(valid)
      expect(res.status).toBe(401)
    })

    it('rejects a body missing a required field', async () => {
      const [firstField] = Object.keys(valid)
      const incomplete = { ...valid }
      delete incomplete[firstField]

      expect((await create(incomplete)).status).toBe(400)
    })

    // A raw spread of req.body would let a caller set the row's own id or
    // overwrite a relation.
    it('ignores fields outside the writable set', async () => {
      await create({ ...valid, ...forbidden })

      const { data } = prisma[model].create.mock.calls[0][0]
      for (const key of Object.keys(forbidden)) {
        expect(data[key]).toBeUndefined()
      }
    })

    it('updates only the writable fields', async () => {
      await as(request(app).put(`${path}/row-1`), writer).send({
        ...valid,
        ...forbidden,
      })

      const { data } = prisma[model].update.mock.calls[0][0]
      for (const key of Object.keys(forbidden)) {
        expect(data[key]).toBeUndefined()
      }
    })

    it('deletes for an authorised writer and refuses everyone else', async () => {
      expect(
        (await as(request(app).delete(`${path}/row-1`), writer)).status,
      ).toBe(204)
      expect(
        (await as(request(app).delete(`${path}/row-1`), refused)).status,
      ).toBe(403)
    })
  },
)

describe('facility status', () => {
  it('accepts the status-only update the staff screen sends', async () => {
    const res = await as(
      request(app).put('/api/facilities/row-1'),
      'STAFF',
    ).send({ status: 'MAINTENANCE', statusReason: 'Pump replacement' })

    expect(res.status).toBe(200)
    expect(prisma.facility.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'MAINTENANCE', statusReason: 'Pump replacement' },
      }),
    )
  })
})

// postedBy is who is accountable for an announcement, so it has to come from
// the authenticated session rather than the request body.
describe('notice authorship', () => {
  it('stamps the author from the session, not the body', async () => {
    await as(request(app).post('/api/notices'), 'MANAGEMENT').send({
      title: 'Lift maintenance',
      category: 'Maintenance',
      body: 'Lift B is out of service on Tuesday.',
      postedBy: 'Someone Else',
    })

    const { data } = prisma.notice.create.mock.calls[0][0]
    expect(data.postedBy).toBe('Concierge Desk')
  })
})

// Residents need to browse what they can book; the write side is what is gated.
describe('open read access', () => {
  it.each([
    '/api/facilities',
    '/api/restaurants',
    '/api/notices',
    '/api/tables',
  ])('lets a member read %s', async (path) => {
    expect((await as(request(app).get(path), 'MEMBER')).status).toBe(200)
  })

  it('keeps the staff directory away from members', async () => {
    expect((await as(request(app).get('/api/staff'), 'MEMBER')).status).toBe(
      403,
    )
  })
})
