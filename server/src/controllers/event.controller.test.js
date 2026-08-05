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

const validEvent = {
  title: 'Rooftop Yoga',
  category: 'Wellness',
  description: 'Sunrise session on the roof deck',
  image: '/images/events/yoga.webp',
  date: '2026-09-01',
  time: '07:00',
  location: 'Roof Deck',
  capacity: 20,
}

const event = (over = {}) => ({
  id: 'event-1',
  capacity: 2,
  rsvps: [],
  ...over,
})

const rsvp = (residentId) => ({ residentId })

beforeEach(() => {
  vi.clearAllMocks()
  prisma.communityEvent.findUnique.mockResolvedValue(event())
  prisma.communityEvent.create.mockImplementation(async ({ data }) => ({
    id: 'event-1',
    ...data,
  }))
  prisma.communityEvent.update.mockImplementation(async ({ where, data }) => ({
    id: where.id,
    ...data,
  }))
})

// Capacity is a real physical limit on the room, not a UI hint — the client's
// disabled button is not what keeps an event from being oversubscribed.
describe('POST /api/events/:id/rsvp', () => {
  const post = (role = 'MEMBER', body = {}) =>
    as(request(app).post('/api/events/event-1/rsvp'), role).send(body)

  it('adds the caller to an event with room left', async () => {
    const res = await post()

    expect(res.status).toBe(201)
    expect(prisma.eventRsvp.upsert).toHaveBeenCalled()
  })

  it('refuses once the event is full', async () => {
    prisma.communityEvent.findUnique.mockResolvedValue(
      event({ capacity: 2, rsvps: [rsvp('resident-8'), rsvp('resident-9')] }),
    )

    const res = await post()

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/fully booked/i)
    expect(prisma.eventRsvp.upsert).not.toHaveBeenCalled()
  })

  // Re-confirming must not consume a second seat, or a resident could fill an
  // event by clicking twice.
  it('lets someone already attending a full event re-confirm', async () => {
    prisma.communityEvent.findUnique.mockResolvedValue(
      event({ capacity: 2, rsvps: [rsvp('resident-1'), rsvp('resident-9')] }),
    )

    const res = await post()

    expect(res.status).toBe(201)
  })

  it('404s on an event that does not exist', async () => {
    prisma.communityEvent.findUnique.mockResolvedValue(null)

    expect((await post()).status).toBe(404)
  })

  it('books the seat for the caller, not whoever the body names', async () => {
    await post('MEMBER', { residentId: 'someone-else' })

    const call = prisma.eventRsvp.upsert.mock.calls[0][0]
    expect(JSON.stringify(call)).toContain('resident-1')
    expect(JSON.stringify(call)).not.toContain('someone-else')
  })
})

describe('POST /api/events/:id/rsvp/cancel', () => {
  it('removes the caller from the event', async () => {
    const res = await as(
      request(app).post('/api/events/event-1/rsvp/cancel'),
      'MEMBER',
    ).send({})

    expect(res.status).toBe(200)
    expect(prisma.eventRsvp.deleteMany).toHaveBeenCalled()
  })

  it('cancels only the caller own seat', async () => {
    await as(
      request(app).post('/api/events/event-1/rsvp/cancel'),
      'MEMBER',
    ).send({ residentId: 'someone-else' })

    const call = prisma.eventRsvp.deleteMany.mock.calls[0][0]
    expect(JSON.stringify(call)).not.toContain('someone-else')
  })
})

describe('event writes', () => {
  const create = (body, role = 'MANAGEMENT') =>
    as(request(app).post('/api/events'), role).send(body)

  it('creates an event for management', async () => {
    const res = await create(validEvent)
    expect(res.status).toBe(201)
  })

  it('normalises a bare date into a full timestamp', async () => {
    await create(validEvent)

    const { data } = prisma.communityEvent.create.mock.calls[0][0]
    expect(data.date).toBe('2026-09-01T00:00:00.000Z')
  })

  // No staff screen authors events, so staff write access would be an unused
  // permission rather than a capability.
  it.each(['MEMBER', 'STAFF'])('refuses a %s author', async (role) => {
    expect((await create(validEvent, role)).status).toBe(403)
  })

  it('rejects an image that is not a link on this site or an https URL', async () => {
    const res = await create({ ...validEvent, image: 'javascript:alert(1)' })
    expect(res.status).toBe(400)
  })

  it('accepts an event with no end time', async () => {
    const res = await create({ ...validEvent, endTime: null })
    expect(res.status).toBe(201)
  })

  it('ignores fields outside the writable set', async () => {
    await create({
      ...validEvent,
      id: 'chosen-id',
      rsvps: [],
      createdAt: '2020-01-01',
    })

    const { data } = prisma.communityEvent.create.mock.calls[0][0]
    expect(data.id).toBeUndefined()
    expect(data.rsvps).toBeUndefined()
    expect(data.createdAt).toBeUndefined()
  })
})
