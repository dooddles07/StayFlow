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
    },
  }
})

const { prisma } = await import('../config/db.js')
const { default: app } = await import('../app.js')

const notification = (over = {}) => ({
  id: 'notif-1',
  residentId: 'resident-1',
  staffId: null,
  read: false,
  ...over,
})

const validNotification = {
  kind: 'BOOKING',
  title: 'Booking confirmed',
  body: 'Your pool slot is confirmed.',
  residentId: 'resident-1',
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.appNotification.findUnique.mockResolvedValue(notification())
  prisma.appNotification.create.mockImplementation(async ({ data }) => ({
    id: 'notif-1',
    ...data,
  }))
})

describe('POST /api/notifications', () => {
  const create = (body, role = 'STAFF') =>
    as(request(app).post('/api/notifications'), role).send(body)

  it('creates a notification addressed to a resident', async () => {
    const res = await create(validNotification)
    expect(res.status).toBe(201)
  })

  // A notification belongs to exactly one inbox; addressing both or neither
  // produces a row nobody can see or one that appears twice.
  it('refuses a notification addressed to both a resident and a staff member', async () => {
    const res = await create({
      ...validNotification,
      staffId: 'staff-1',
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/exactly one/i)
  })

  it('refuses a notification addressed to nobody', async () => {
    const res = await create({
      kind: 'BOOKING',
      title: 'Booking confirmed',
      body: 'Your pool slot is confirmed.',
    })

    expect(res.status).toBe(400)
  })

  it.each(['kind', 'title', 'body'])('requires %s', async (field) => {
    const res = await create({ ...validNotification, [field]: '' })
    expect(res.status).toBe(400)
  })

  it('ignores fields outside the writable set', async () => {
    await create({ ...validNotification, read: true, id: 'chosen' })

    const { data } = prisma.appNotification.create.mock.calls[0][0]
    expect(data.read).toBeUndefined()
    expect(data.id).toBeUndefined()
  })

  it('is closed to members', async () => {
    expect((await create(validNotification, 'MEMBER')).status).toBe(403)
  })
})

// take is passed straight to Prisma, so an unvalidated value became a NaN take
// and an unmapped 500 rather than a clear rejection.
describe('GET /api/notifications — list bounds', () => {
  it.each(['abc', '0', '-5', '1.5', '99999'])(
    'rejects a limit of %s',
    async (limit) => {
      const res = await as(
        request(app).get(`/api/notifications?limit=${limit}`),
        'MANAGEMENT',
      )

      expect(res.status).toBe(400)
    },
  )

  it('honours a valid limit', async () => {
    const res = await as(
      request(app).get('/api/notifications?limit=25'),
      'MANAGEMENT',
    )

    expect(res.status).toBe(200)
    expect(prisma.appNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25 }),
    )
  })

  it('applies a bounded default when none is given', async () => {
    await as(request(app).get('/api/notifications'), 'MANAGEMENT')

    const { take } = prisma.appNotification.findMany.mock.calls[0][0]
    expect(take).toBeGreaterThan(0)
    expect(take).toBeLessThanOrEqual(500)
  })

  it('keeps the global list away from members', async () => {
    expect(
      (await as(request(app).get('/api/notifications'), 'MEMBER')).status,
    ).toBe(403)
  })
})

describe('reading notifications', () => {
  it('marks the caller own notification read', async () => {
    const res = await as(
      request(app).post('/api/notifications/notif-1/read'),
      'MEMBER',
    ).send({})

    expect(res.status).toBe(200)
    expect(prisma.appNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { read: true } }),
    )
  })

  it('refuses to mark a notification the caller does not own', async () => {
    prisma.appNotification.findUnique.mockResolvedValue(
      notification({ residentId: 'resident-9' }),
    )

    const res = await as(
      request(app).post('/api/notifications/notif-1/read'),
      'MEMBER',
    ).send({})

    expect(res.status).toBe(403)
    expect(prisma.appNotification.update).not.toHaveBeenCalled()
  })

  it('marks only the caller own inbox read in bulk', async () => {
    const res = await as(
      request(app).post('/api/notifications/resident/resident-1/read-all'),
      'MEMBER',
    ).send({})

    expect(res.status).toBe(204)
    expect(prisma.appNotification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { residentId: 'resident-1', read: false },
      }),
    )
  })

  it("refuses to clear another resident's inbox", async () => {
    const res = await as(
      request(app).post('/api/notifications/resident/resident-9/read-all'),
      'MEMBER',
    ).send({})

    expect(res.status).toBe(403)
  })

  // Everyone's inbox at once is a management action, not a staff one.
  it('reserves the global read-all for management', async () => {
    expect(
      (
        await as(
          request(app).post('/api/notifications/read-all'),
          'STAFF',
        ).send({})
      ).status,
    ).toBe(403)
    expect(
      (
        await as(
          request(app).post('/api/notifications/read-all'),
          'MANAGEMENT',
        ).send({})
      ).status,
    ).toBe(204)
  })
})

describe('DELETE /api/notifications/:id', () => {
  it('lets a staff member delete their own notification', async () => {
    prisma.appNotification.findUnique.mockResolvedValue(
      notification({ residentId: null, staffId: 'staff-1' }),
    )

    const res = await as(
      request(app).delete('/api/notifications/notif-1'),
      'STAFF',
    )

    expect(res.status).toBe(204)
  })

  it("refuses to delete a peer's notification", async () => {
    prisma.appNotification.findUnique.mockResolvedValue(
      notification({ residentId: null, staffId: 'staff-9' }),
    )

    const res = await as(
      request(app).delete('/api/notifications/notif-1'),
      'STAFF',
    )

    expect(res.status).toBe(403)
    expect(prisma.appNotification.delete).not.toHaveBeenCalled()
  })

  it('refuses members outright', async () => {
    const res = await as(
      request(app).delete('/api/notifications/notif-1'),
      'MEMBER',
    )
    expect(res.status).toBe(403)
  })
})
