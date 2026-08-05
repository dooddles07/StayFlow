import bcrypt from 'bcryptjs'
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

const { prisma } = await import('../config/db.js')
const { default: app } = await import('../app.js')

const resident = (over = {}) => ({
  id: 'resident-1',
  name: 'Ana Reyes',
  email: 'Ana.Reyes@Stayflow.io',
  unit: '12B',
  tier: 'SIGNATURE',
  family: [],
  vehicles: [],
  ...over,
})

const authState = { id: 'user-1', tokenVersion: 1, isActive: true }

const validResident = {
  name: 'Ana Reyes',
  email: 'ana@stayflow.io',
  phone: '',
  unit: '12B',
  tier: 'SIGNATURE',
  avatarSeed: 'ana',
  moveInDate: '2026-01-15',
  dietary: [],
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  // requireAuth and the controllers both read prisma.user.findUnique; the select
  // that requireAuth uses is what distinguishes the auth lookup.
  prisma.user.findUnique.mockImplementation(async (args) =>
    args.select ? authState : null,
  )
  prisma.resident.findUnique.mockResolvedValue(resident())
  prisma.resident.create.mockImplementation(async ({ data }) => ({
    id: 'resident-1',
    ...data,
  }))
  prisma.resident.update.mockImplementation(async ({ where, data }) => ({
    id: where.id,
    ...data,
  }))
  prisma.user.create.mockImplementation(async ({ data }) => ({
    id: 'user-9',
    ...data,
  }))
})

// Issuing a login is the one place the API mints a credential. It is read aloud
// to a resident in person, so it has to be generated here and never chosen by
// the caller.
describe('POST /api/residents/:id/create-login', () => {
  const createLogin = (role = 'MANAGEMENT') =>
    as(request(app).post('/api/residents/resident-1/create-login'), role).send(
      {},
    )

  it('issues a login with a temporary password that must be changed', async () => {
    const res = await createLogin()

    expect(res.status).toBe(201)
    expect(res.body.tempPassword).toHaveLength(12)
    const { data } = prisma.user.create.mock.calls[0][0]
    expect(data.mustChangePassword).toBe(true)
    expect(data.role).toBe('MEMBER')
    expect(data.residentId).toBe('resident-1')
  })

  it('stores a hash, never the temporary password', async () => {
    const res = await createLogin()

    const { data } = prisma.user.create.mock.calls[0][0]
    expect(data.passwordHash).not.toBe(res.body.tempPassword)
    expect(bcrypt.compareSync(res.body.tempPassword, data.passwordHash)).toBe(
      true,
    )
  })

  // The password is read aloud, so characters that sound or look alike would
  // turn into support calls.
  it('leaves ambiguous characters out of the temporary password', async () => {
    const res = await createLogin()
    expect(res.body.tempPassword).not.toMatch(/[0O1lI]/)
  })

  it('lowercases the sign-in identity so login is case-insensitive', async () => {
    const res = await createLogin()

    expect(res.body.email).toBe('ana.reyes@stayflow.io')
    expect(prisma.user.create.mock.calls[0][0].data.email).toBe(
      'ana.reyes@stayflow.io',
    )
  })

  it('refuses a resident who already has a login', async () => {
    prisma.user.findUnique.mockImplementation(async (args) =>
      args.select ? authState : { id: 'user-existing' },
    )

    const res = await createLogin()

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already has a login/i)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('404s on a resident who does not exist', async () => {
    prisma.resident.findUnique.mockResolvedValue(null)
    expect((await createLogin()).status).toBe(404)
  })

  it.each(['MEMBER', 'STAFF'])('refuses a %s caller', async (role) => {
    expect((await createLogin(role)).status).toBe(403)
  })
})

describe('resident admin writes', () => {
  it('creates a resident profile for management', async () => {
    const res = await as(
      request(app).post('/api/residents'),
      'MANAGEMENT',
    ).send(validResident)

    expect(res.status).toBe(201)
  })

  // No staff screen edits resident profiles, so staff write access would be an
  // unused permission rather than a capability.
  it('refuses a staff author', async () => {
    const res = await as(request(app).post('/api/residents'), 'STAFF').send(
      validResident,
    )
    expect(res.status).toBe(403)
  })

  it('limits an admin edit to identity and unit', async () => {
    await as(request(app).put('/api/residents/resident-1'), 'MANAGEMENT').send({
      name: 'Ana R.',
      unit: '14A',
      dietary: ['nuts'],
      phone: '0917',
      emergencyPhone: '0918',
    })

    expect(prisma.resident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Ana R.', unit: '14A' } }),
    )
  })

  it('rejects a tier the schema does not know', async () => {
    const res = await as(
      request(app).put('/api/residents/resident-1'),
      'MANAGEMENT',
    ).send({ tier: 'PLATINUM' })

    expect(res.status).toBe(400)
  })

  it('keeps the resident directory away from members', async () => {
    expect(
      (await as(request(app).get('/api/residents'), 'MEMBER')).status,
    ).toBe(403)
  })
})

// "My profile" is always scoped to the residentId on the token, so a member can
// never read or write another resident by changing a request.
describe('/api/residents/me', () => {
  it('returns the profile linked to the token', async () => {
    const res = await as(request(app).get('/api/residents/me'), 'MEMBER')

    expect(res.status).toBe(200)
    expect(prisma.resident.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'resident-1' } }),
    )
  })

  it('explains itself when the account has no resident profile', async () => {
    const res = await as(request(app).get('/api/residents/me'), 'MEMBER', {
      residentId: null,
    })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/no resident profile/i)
  })

  // unit and tier decide what a resident may book; email is the login identity.
  it('drops the admin-controlled fields from a self edit', async () => {
    await as(request(app).put('/api/residents/me'), 'MEMBER').send({
      name: 'Ana R.',
      phone: '0917 555 0101',
      unit: 'PENTHOUSE',
      tier: 'ELITE',
      email: 'new@stayflow.io',
    })

    expect(prisma.resident.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'resident-1' },
        data: { name: 'Ana R.', phone: '0917 555 0101' },
      }),
    )
  })

  it('trims and de-duplicates dietary notes', async () => {
    await as(request(app).put('/api/residents/me'), 'MEMBER').send({
      dietary: [' nuts ', 'nuts', '', 'shellfish'],
    })

    expect(prisma.resident.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dietary: ['nuts', 'shellfish'] } }),
    )
  })

  it('rejects dietary notes that are not a list', async () => {
    const res = await as(request(app).put('/api/residents/me'), 'MEMBER').send({
      dietary: 'nuts',
    })

    expect(res.status).toBe(400)
  })
})

describe('/api/residents/me/family', () => {
  it('adds a family member', async () => {
    const res = await as(
      request(app).post('/api/residents/me/family'),
      'MEMBER',
    ).send({ name: 'Miguel', relation: 'Son', age: 9 })

    expect(res.status).toBe(201)
    expect(prisma.familyMember.create).toHaveBeenCalled()
  })

  it.each([-1, 131, 4.5, 'nine'])('rejects an age of %s', async (age) => {
    const res = await as(
      request(app).post('/api/residents/me/family'),
      'MEMBER',
    ).send({ name: 'Miguel', relation: 'Son', age })

    expect(res.status).toBe(400)
  })

  // The row id comes from the URL, so ownership has to be checked rather than
  // assumed from the fact that the caller is signed in.
  it('refuses to edit a family member belonging to another resident', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      id: 'fam-1',
      residentId: 'resident-9',
    })

    const res = await as(
      request(app).put('/api/residents/me/family/fam-1'),
      'MEMBER',
    ).send({ name: 'Miguel', relation: 'Son', age: 9 })

    expect(res.status).toBe(404)
    expect(prisma.familyMember.update).not.toHaveBeenCalled()
  })

  it('edits a family member the caller owns', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      id: 'fam-1',
      residentId: 'resident-1',
    })

    const res = await as(
      request(app).put('/api/residents/me/family/fam-1'),
      'MEMBER',
    ).send({ name: 'Miguel', relation: 'Son', age: 10 })

    expect(res.status).toBe(200)
    expect(prisma.familyMember.update).toHaveBeenCalled()
  })
})

describe('/api/residents/me/vehicles', () => {
  it('adds a vehicle', async () => {
    const res = await as(
      request(app).post('/api/residents/me/vehicles'),
      'MEMBER',
    ).send({ make: 'Toyota', model: 'Vios', plate: 'ABC 123', color: 'Silver' })

    expect(res.status).toBe(201)
    expect(prisma.vehicle.create).toHaveBeenCalled()
  })

  it('refuses to remove a vehicle belonging to another resident', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({
      id: 'veh-1',
      residentId: 'resident-9',
    })

    const res = await as(
      request(app).delete('/api/residents/me/vehicles/veh-1'),
      'MEMBER',
    )

    expect(res.status).toBe(404)
    expect(prisma.vehicle.delete).not.toHaveBeenCalled()
  })

  it('rejects a vehicle missing its plate', async () => {
    const res = await as(
      request(app).post('/api/residents/me/vehicles'),
      'MEMBER',
    ).send({ make: 'Toyota', model: 'Vios', color: 'Silver' })

    expect(res.status).toBe(400)
  })
})
