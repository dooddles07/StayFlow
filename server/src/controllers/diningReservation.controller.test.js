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

const validReservation = {
  restaurantId: 'rest-1',
  date: '2026-09-01',
  time: '19:00',
  partySize: 4,
  seating: 'INDOOR',
}

const reservation = (over = {}) => ({
  id: 'res-1',
  restaurantId: 'rest-1',
  residentId: 'resident-1',
  partySize: 4,
  status: 'PENDING',
  tableId: null,
  ...over,
})

const post = (body = validReservation, role = 'MEMBER') =>
  as(request(app).post('/api/dining-reservations'), role).send(body)

const put = (status, current, role = 'STAFF') => {
  prisma.diningReservation.findUnique.mockResolvedValue(reservation(current))
  return as(request(app).put('/api/dining-reservations/res-1'), role).send({
    status,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  prisma.restaurant.findUnique.mockResolvedValue({
    id: 'rest-1',
    maxPartySize: 8,
  })
  prisma.diningTable.findFirst.mockResolvedValue({
    id: 'table-1',
    seats: 4,
    status: 'AVAILABLE',
  })
  // clearAllMocks wipes recorded calls but keeps implementations, so anything a
  // previous case made reject has to be restored here.
  prisma.diningTable.update.mockResolvedValue({ id: 'table-1' })
  prisma.diningReservation.create.mockImplementation(async ({ data }) => ({
    id: 'res-1',
    ...data,
  }))
  prisma.diningReservation.update.mockImplementation(
    async ({ where, data }) => ({
      id: where.id,
      ...data,
    }),
  )
})

describe('POST /api/dining-reservations', () => {
  it('creates a pending reservation with no table held', async () => {
    const res = await post()

    expect(res.status).toBe(201)
    expect(prisma.diningReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING', tableId: null }),
      }),
    )
  })

  // Self-confirming would skip assignTableIfAvailable entirely, and naming a
  // table would take one that may already be occupied.
  it('refuses to let the caller pick their own status or table', async () => {
    await post({
      ...validReservation,
      status: 'CONFIRMED',
      tableId: 'table-9',
    })

    expect(prisma.diningReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING', tableId: null }),
      }),
    )
  })

  it('rejects a party over the restaurant maximum', async () => {
    const res = await post({ ...validReservation, partySize: 20 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/max online party size of 8/)
  })

  it('rejects a restaurant that does not exist', async () => {
    prisma.restaurant.findUnique.mockResolvedValue(null)
    expect((await post()).status).toBe(400)
  })

  it('books for the caller, not for whoever the body names', async () => {
    await post({ ...validReservation, residentId: 'someone-else' })

    expect(prisma.diningReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ residentId: 'resident-1' }),
      }),
    )
  })
})

// Confirming holds a real table, and the table map is what the restaurant runs
// its evening from — a wrong transition either strands a table or double-seats
// a party.
describe('PUT /api/dining-reservations/:id — table side effects', () => {
  it('holds the smallest table that fits when confirming', async () => {
    const res = await put('CONFIRMED', { status: 'PENDING', partySize: 4 })

    expect(res.status).toBe(200)
    expect(prisma.diningTable.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'AVAILABLE',
          seats: { gte: 4 },
        }),
        orderBy: { seats: 'asc' },
      }),
    )
    expect(prisma.diningTable.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'RESERVED' } }),
    )
  })

  it('refuses to confirm when nothing free seats the party', async () => {
    prisma.diningTable.findFirst.mockResolvedValue(null)

    const res = await put('CONFIRMED', { status: 'PENDING', partySize: 6 })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/No available table/)
    expect(prisma.diningReservation.update).not.toHaveBeenCalled()
  })

  it('treats a lost race for the last table as a conflict, not a 500', async () => {
    // Once per attempt: the assignment retries a serialization failure once.
    const writeConflict = () =>
      Object.assign(new Error('write conflict'), { code: 'P2034' })
    prisma.diningTable.update
      .mockRejectedValueOnce(writeConflict())
      .mockRejectedValueOnce(writeConflict())

    const res = await put('CONFIRMED', { status: 'PENDING', partySize: 4 })

    expect(res.status).toBe(409)
  })

  it('assigns the table inside a serializable transaction', async () => {
    await put('CONFIRMED', { status: 'PENDING' })

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    )
  })

  it('marks the held table occupied on arrival', async () => {
    await put('ARRIVED', { status: 'CONFIRMED', tableId: 'table-1' })

    expect(prisma.diningTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'table-1' },
        data: { status: 'OCCUPIED' },
      }),
    )
  })

  it('releases the table when a confirmed reservation is cancelled', async () => {
    await put('CANCELLED', { status: 'CONFIRMED', tableId: 'table-1' })

    expect(prisma.diningTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'table-1' },
        data: { status: 'AVAILABLE' },
      }),
    )
  })

  it('touches no table when cancelling a reservation that never held one', async () => {
    await put('CANCELLED', { status: 'PENDING', tableId: null })

    expect(prisma.diningTable.update).not.toHaveBeenCalled()
  })

  it('does not re-assign a table to a reservation that already holds one', async () => {
    await put('CONFIRMED', { status: 'PENDING', tableId: 'table-1' })

    expect(prisma.diningTable.findFirst).not.toHaveBeenCalled()
  })
})

describe('PUT /api/dining-reservations/:id — transitions', () => {
  it.each([
    ['PENDING', 'CONFIRMED'],
    ['PENDING', 'CANCELLED'],
    ['CONFIRMED', 'ARRIVED'],
    ['CONFIRMED', 'CANCELLED'],
  ])('allows %s -> %s', async (from, to) => {
    const res = await put(to, { status: from, tableId: 'table-1' })
    expect(res.status).toBe(200)
  })

  it.each([
    ['PENDING', 'ARRIVED'],
    ['ARRIVED', 'CONFIRMED'],
    ['CANCELLED', 'CONFIRMED'],
    ['CONFIRMED', 'PENDING'],
  ])('refuses %s -> %s', async (from, to) => {
    const res = await put(to, { status: from, tableId: 'table-1' })

    expect(res.status).toBe(409)
    expect(prisma.diningReservation.update).not.toHaveBeenCalled()
  })

  it('ignores every field except status', async () => {
    prisma.diningReservation.findUnique.mockResolvedValue(reservation())

    await as(request(app).put('/api/dining-reservations/res-1'), 'STAFF').send({
      status: 'CANCELLED',
      residentId: 'someone-else',
      partySize: 99,
    })

    expect(prisma.diningReservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } }),
    )
  })

  it('does not let a member move their own reservation along', async () => {
    const res = await put('CONFIRMED', { status: 'PENDING' }, 'MEMBER')
    expect(res.status).toBe(403)
  })
})

// findAvailableTable only ever looks at AVAILABLE tables, so a table left
// RESERVED by a deleted reservation is stranded for good.
describe('DELETE /api/dining-reservations/:id', () => {
  it('releases the held table before removing the row', async () => {
    prisma.diningReservation.findUnique.mockResolvedValue(
      reservation({ status: 'CONFIRMED', tableId: 'table-1' }),
    )

    const res = await as(
      request(app).delete('/api/dining-reservations/res-1'),
      'MANAGEMENT',
    )

    expect(res.status).toBe(204)
    expect(prisma.diningTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'table-1' },
        data: { status: 'AVAILABLE' },
      }),
    )
    expect(prisma.diningReservation.delete).toHaveBeenCalled()
  })

  it('deletes cleanly when no table was held', async () => {
    prisma.diningReservation.findUnique.mockResolvedValue(reservation())

    const res = await as(
      request(app).delete('/api/dining-reservations/res-1'),
      'MANAGEMENT',
    )

    expect(res.status).toBe(204)
    expect(prisma.diningTable.update).not.toHaveBeenCalled()
  })
})
