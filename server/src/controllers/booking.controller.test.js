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

const facility = (over = {}) => ({ id: 'fac-1', capacity: 10, ...over })

const validBooking = {
  facilityId: 'fac-1',
  date: '2026-09-01',
  timeSlot: '09:00-10:00',
  partySize: 4,
}

const post = (body = validBooking, role = 'MEMBER') =>
  as(request(app).post('/api/bookings'), role).send(body)

beforeEach(() => {
  vi.clearAllMocks()
  prisma.facility.findUnique.mockResolvedValue(facility())
  prisma.booking.findFirst.mockResolvedValue(null)
  prisma.booking.create.mockImplementation(async ({ data }) => ({
    id: 'booking-1',
    status: 'PENDING',
    ...data,
  }))
})

// docs/PRD.md names "no double-booking of facilities under concurrent
// requests" as a success criterion, and the guard for it lives across a
// serializable transaction, a retry, and a partial unique index in raw SQL.
describe('POST /api/bookings — slot conflicts', () => {
  it('creates a booking when the slot is free', async () => {
    const res = await post()

    expect(res.status).toBe(201)
    expect(prisma.booking.create).toHaveBeenCalledTimes(1)
  })

  it('refuses the slot when a live booking already holds it', async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: 'existing' })

    const res = await post()

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/just taken/i)
    expect(prisma.booking.create).not.toHaveBeenCalled()
  })

  it('ignores a cancelled booking on the same slot', async () => {
    // The conflict query excludes CANCELLED, so a freed slot must be bookable.
    const res = await post()

    expect(res.status).toBe(201)
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: 'CANCELLED' } }),
      }),
    )
  })

  it('treats the database catching the race as a conflict, not a 500', async () => {
    // P2002 is the partial unique index firing when two transactions slipped
    // past the in-transaction check.
    prisma.booking.create.mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' }),
    )

    const res = await post()

    expect(res.status).toBe(409)
  })

  it('retries a serialization failure once before giving up', async () => {
    prisma.booking.create
      .mockRejectedValueOnce(
        Object.assign(new Error('write conflict'), { code: 'P2034' }),
      )
      .mockResolvedValueOnce({ id: 'booking-1', status: 'PENDING' })

    const res = await post()

    expect(res.status).toBe(201)
    expect(prisma.booking.create).toHaveBeenCalledTimes(2)
  })

  it('gives up with a conflict when both attempts hit a write conflict', async () => {
    prisma.booking.create.mockRejectedValue(
      Object.assign(new Error('write conflict'), { code: 'P2034' }),
    )

    const res = await post()

    expect(res.status).toBe(409)
    expect(prisma.booking.create).toHaveBeenCalledTimes(2)
  })

  it('runs the check and the insert in one serializable transaction', async () => {
    await post()

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    )
  })
})

describe('POST /api/bookings — input rules', () => {
  it('rejects a party larger than the facility holds', async () => {
    prisma.facility.findUnique.mockResolvedValue(facility({ capacity: 2 }))

    const res = await post({ ...validBooking, partySize: 8 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/capacity of 2/)
  })

  it('rejects a booking for a facility that does not exist', async () => {
    prisma.facility.findUnique.mockResolvedValue(null)

    const res = await post()

    expect(res.status).toBe(400)
  })

  it.each([
    ['partySize', 0],
    ['partySize', -1],
    ['partySize', 1.5],
  ])('rejects %s of %s', async (field, value) => {
    const res = await post({ ...validBooking, [field]: value })
    expect(res.status).toBe(400)
  })

  it('rejects a malformed date', async () => {
    const res = await post({ ...validBooking, date: 'next tuesday' })
    expect(res.status).toBe(400)
  })

  // status is not in CREATE_FIELDS, and the controller pins it as well.
  it('forces a new booking to PENDING however the caller asks', async () => {
    await post({ ...validBooking, status: 'CONFIRMED' })

    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING' }),
      }),
    )
  })

  it('books for the caller, not for whoever the body names', async () => {
    // requireOwnResidentBody injects the caller's own residentId.
    await post({ ...validBooking, residentId: 'someone-else' })

    expect(prisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ residentId: 'resident-1' }),
      }),
    )
  })
})

describe('PUT /api/bookings/:id — status transitions', () => {
  const put = (status, current, role = 'STAFF') => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'booking-1', ...current })
    return as(request(app).put('/api/bookings/booking-1'), role).send({
      status,
    })
  }

  it.each([
    ['PENDING', 'CONFIRMED'],
    ['PENDING', 'CANCELLED'],
    ['CONFIRMED', 'CANCELLED'],
  ])('allows %s -> %s', async (from, to) => {
    const res = await put(to, { status: from })
    expect(res.status).toBe(200)
  })

  it.each([
    ['CANCELLED', 'CONFIRMED'],
    ['CANCELLED', 'PENDING'],
    ['CONFIRMED', 'PENDING'],
  ])('refuses %s -> %s', async (from, to) => {
    const res = await put(to, { status: from })

    expect(res.status).toBe(409)
    expect(prisma.booking.update).not.toHaveBeenCalled()
  })

  it('rejects a status the schema does not know', async () => {
    const res = await put('DELETED', { status: 'PENDING' })
    expect(res.status).toBe(400)
  })

  it('404s on a booking that does not exist', async () => {
    prisma.booking.findUnique.mockResolvedValue(null)
    const res = await as(request(app).put('/api/bookings/nope'), 'STAFF').send({
      status: 'CONFIRMED',
    })

    expect(res.status).toBe(404)
  })

  // ADMIN_UPDATE_FIELDS is status only: reassigning a booking to another
  // resident or another facility would skip the capacity check entirely.
  it('ignores every field except status', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'PENDING',
    })
    await as(request(app).put('/api/bookings/booking-1'), 'STAFF').send({
      status: 'CONFIRMED',
      residentId: 'someone-else',
      facilityId: 'other-facility',
      partySize: 999,
    })

    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CONFIRMED' } }),
    )
  })

  it('does not let a member approve their own booking', async () => {
    const res = await put('CONFIRMED', { status: 'PENDING' }, 'MEMBER')
    expect(res.status).toBe(403)
  })
})
