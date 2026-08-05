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

const validGuest = {
  name: 'Ana Reyes',
  purpose: 'Family visit',
  arrivalDate: '2026-09-01',
  arrivalTime: '14:00',
}

const guest = (over = {}) => ({
  id: 'guest-1',
  hostResidentId: 'resident-1',
  status: 'PENDING',
  passNumber: 'SF-GP-ABCD1234',
  checkedInAt: null,
  checkedOutAt: null,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  prisma.guest.findUnique.mockResolvedValue(null)
  prisma.guest.create.mockImplementation(async ({ data }) => ({
    id: 'guest-1',
    ...data,
  }))
  prisma.guest.update.mockImplementation(async ({ where, data }) => ({
    id: where.id,
    ...data,
  }))
})

// docs/PRD.md names the guest pass lifecycle as a success criterion: register,
// approve, check in at the door, check out. Each step is only valid from the
// one before it.
describe('POST /api/guests', () => {
  it('registers a pending guest with a server-issued pass number', async () => {
    const res = await as(request(app).post('/api/guests'), 'MEMBER').send(
      validGuest,
    )

    expect(res.status).toBe(201)
    const { data } = prisma.guest.create.mock.calls[0][0]
    expect(data.status).toBe('PENDING')
    expect(data.passNumber).toMatch(/^SF-GP-[0-9A-F]{8}$/)
  })

  it('issues a different pass number each time', async () => {
    await as(request(app).post('/api/guests'), 'MEMBER').send(validGuest)
    await as(request(app).post('/api/guests'), 'MEMBER').send(validGuest)

    const [first, second] = prisma.guest.create.mock.calls.map(
      (call) => call[0].data.passNumber,
    )
    expect(first).not.toBe(second)
  })

  it('retries when the generated pass number is already taken', async () => {
    prisma.guest.findUnique
      .mockResolvedValueOnce(guest())
      .mockResolvedValueOnce(null)

    const res = await as(request(app).post('/api/guests'), 'MEMBER').send(
      validGuest,
    )

    expect(res.status).toBe(201)
    expect(prisma.guest.findUnique).toHaveBeenCalledTimes(2)
  })

  it('gives up rather than issuing a colliding pass number', async () => {
    prisma.guest.findUnique.mockResolvedValue(guest())

    const res = await as(request(app).post('/api/guests'), 'MEMBER').send(
      validGuest,
    )

    expect(res.status).toBe(400)
    expect(prisma.guest.create).not.toHaveBeenCalled()
  })

  // Seeding these on a brand-new guest would fabricate a visit that never
  // happened, in the record the front desk trusts.
  it('refuses a caller-supplied status or check-in history', async () => {
    await as(request(app).post('/api/guests'), 'MEMBER').send({
      ...validGuest,
      status: 'CHECKED_IN',
      checkedInAt: '2020-01-01T00:00:00.000Z',
      checkedOutAt: '2020-01-01T01:00:00.000Z',
      passNumber: 'SF-GP-CHOSEN',
    })

    const { data } = prisma.guest.create.mock.calls[0][0]
    expect(data.status).toBe('PENDING')
    expect(data.checkedInAt).toBeUndefined()
    expect(data.checkedOutAt).toBeUndefined()
    expect(data.passNumber).not.toBe('SF-GP-CHOSEN')
  })

  it('hosts the guest under the caller, not whoever the body names', async () => {
    await as(request(app).post('/api/guests'), 'MEMBER').send({
      ...validGuest,
      hostResidentId: 'someone-else',
    })

    expect(prisma.guest.create.mock.calls[0][0].data.hostResidentId).toBe(
      'resident-1',
    )
  })

  it('lets the front desk register on a resident behalf', async () => {
    const res = await as(request(app).post('/api/guests'), 'STAFF').send({
      ...validGuest,
      hostResidentId: 'resident-9',
    })

    expect(res.status).toBe(201)
    expect(prisma.guest.create.mock.calls[0][0].data.hostResidentId).toBe(
      'resident-9',
    )
  })

  it('rejects a registration missing the visit details', async () => {
    const res = await as(request(app).post('/api/guests'), 'MEMBER').send({
      name: 'Ana Reyes',
    })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/guests/:id/check-in', () => {
  const checkIn = (status, role = 'STAFF') => {
    prisma.guest.findUnique.mockResolvedValue(guest({ status }))
    return as(request(app).post('/api/guests/guest-1/check-in'), role).send({})
  }

  it('checks in an approved guest and stamps the time server-side', async () => {
    const res = await checkIn('APPROVED')

    expect(res.status).toBe(200)
    const { data } = prisma.guest.update.mock.calls[0][0]
    expect(data.status).toBe('CHECKED_IN')
    expect(data.checkedInAt).toBeInstanceOf(Date)
  })

  it.each(['PENDING', 'CHECKED_IN', 'CHECKED_OUT'])(
    'refuses to check in a guest that is %s',
    async (status) => {
      const res = await checkIn(status)

      expect(res.status).toBe(409)
      expect(prisma.guest.update).not.toHaveBeenCalled()
    },
  )

  it('404s on a guest that does not exist', async () => {
    prisma.guest.findUnique.mockResolvedValue(null)
    const res = await as(
      request(app).post('/api/guests/nope/check-in'),
      'STAFF',
    ).send({})

    expect(res.status).toBe(404)
  })

  it('is closed to residents — check-in happens at the door', async () => {
    const res = await checkIn('APPROVED', 'MEMBER')
    expect(res.status).toBe(403)
  })
})

describe('POST /api/guests/:id/check-out', () => {
  const checkOut = (status, role = 'STAFF') => {
    prisma.guest.findUnique.mockResolvedValue(guest({ status }))
    return as(request(app).post('/api/guests/guest-1/check-out'), role).send({})
  }

  it('checks out a guest who is inside', async () => {
    const res = await checkOut('CHECKED_IN')

    expect(res.status).toBe(200)
    const { data } = prisma.guest.update.mock.calls[0][0]
    expect(data.status).toBe('CHECKED_OUT')
    expect(data.checkedOutAt).toBeInstanceOf(Date)
  })

  it.each(['PENDING', 'APPROVED', 'CHECKED_OUT'])(
    'refuses to check out a guest that is %s',
    async (status) => {
      const res = await checkOut(status)

      expect(res.status).toBe(409)
      expect(prisma.guest.update).not.toHaveBeenCalled()
    },
  )

  it('is closed to residents', async () => {
    const res = await checkOut('CHECKED_IN', 'MEMBER')
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/guests/:id', () => {
  const put = (body, current = {}, role = 'STAFF') => {
    prisma.guest.findUnique.mockResolvedValue(guest(current))
    return as(request(app).put('/api/guests/guest-1'), role).send(body)
  }

  it('lets staff approve a pending guest', async () => {
    const res = await put({ status: 'APPROVED' }, { status: 'PENDING' })

    expect(res.status).toBe(200)
    expect(prisma.guest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'APPROVED' } }),
    )
  })

  // These two statuses are only reachable through check-in/check-out, which
  // verify the prior state and stamp the timestamp themselves.
  it.each(['CHECKED_IN', 'CHECKED_OUT'])(
    'refuses to set %s through a plain edit',
    async (status) => {
      const res = await put({ status }, { status: 'APPROVED' })

      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/use check-in\/check-out/)
    },
  )

  it('refuses to reopen a checked-out visit', async () => {
    const res = await put({ status: 'APPROVED' }, { status: 'CHECKED_OUT' })
    expect(res.status).toBe(409)
  })

  it('lets the host correct visit details', async () => {
    const res = await put(
      { arrivalTime: '16:00', vehiclePlate: 'ABC 123' },
      { status: 'PENDING' },
      'MEMBER',
    )

    expect(res.status).toBe(200)
    expect(prisma.guest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { arrivalTime: '16:00', vehiclePlate: 'ABC 123' },
      }),
    )
  })

  // A host approving their own guest would remove the front desk from the loop
  // entirely; reassigning the host would hand the pass to another unit.
  it('drops status, host and name when the host is the one editing', async () => {
    await put(
      {
        status: 'APPROVED',
        hostResidentId: 'resident-9',
        name: 'Someone Else',
        purpose: 'Delivery',
      },
      { status: 'PENDING' },
      'MEMBER',
    )

    expect(prisma.guest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { purpose: 'Delivery' } }),
    )
  })

  it('404s on a guest that does not exist', async () => {
    prisma.guest.findUnique.mockResolvedValue(null)
    const res = await as(request(app).put('/api/guests/nope'), 'STAFF').send({
      purpose: 'x',
    })

    expect(res.status).toBe(404)
  })

  it('rejects a status the schema does not know', async () => {
    const res = await put({ status: 'BANNED' }, { status: 'PENDING' })
    expect(res.status).toBe(400)
  })
})
