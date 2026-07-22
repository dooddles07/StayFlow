import { ResidentModel } from '../models/resident.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(ResidentModel, 'Resident')

// Mirrors what src/lib/api/resident.ts's createResident actually sends: identity/unit
// fields plus the defaults it fills in for columns the schema requires non-null.
const ADMIN_CREATE_FIELDS = [
  'name',
  'email',
  'phone',
  'unit',
  'tier',
  'avatarSeed',
  'avatarStyle',
  'moveInDate',
  'dietary',
  'notifications',
  'newsletter',
  'emergencyName',
  'emergencyRelation',
  'emergencyPhone',
]
// updateResident is deliberately limited to identity/unit — everything else is the
// resident's own to manage via /residents/me once they have a login.
const ADMIN_UPDATE_FIELDS = ['name', 'email', 'unit', 'tier']

export const residentController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const item = await ResidentModel.create(pickAllowed(req.body, ADMIN_CREATE_FIELDS))
    logAdminAction(req, 'CREATE', 'Resident', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const item = await ResidentModel.update(req.params.id, pickAllowed(req.body, ADMIN_UPDATE_FIELDS))
    logAdminAction(req, 'UPDATE', 'Resident', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await ResidentModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Resident', req.params.id)
    res.status(204).send()
  }),
}

// Fields a MEMBER may change on their own profile. Deliberately excludes
// unit, tier, avatarSeed, moveInDate (admin-controlled) and email (tied to the
// login identity — changing it needs a verification flow, tracked separately).
const SELF_EDITABLE_FIELDS = [
  'name',
  'phone',
  'dietary',
  'notifications',
  'newsletter',
  'emergencyName',
  'emergencyRelation',
  'emergencyPhone',
  'emergency2Name',
  'emergency2Relation',
  'emergency2Phone',
  'avatarSeed',
  'avatarStyle',
]

const requireLinkedResidentId = (req) => {
  const residentId = req.user?.residentId
  if (!residentId) throw ApiError.notFound('No resident profile is linked to this account')
  return residentId
}

const requireString = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') throw ApiError.badRequest(`${field} is required`)
  return value.trim()
}

const parseFamilyInput = (body) => ({
  name: requireString(body.name, 'name'),
  relation: requireString(body.relation, 'relation'),
  age: (() => {
    const age = Number(body.age)
    if (!Number.isInteger(age) || age < 0 || age > 130) throw ApiError.badRequest('age must be a whole number between 0 and 130')
    return age
  })(),
})

const parseVehicleInput = (body) => ({
  make: requireString(body.make, 'make'),
  model: requireString(body.model, 'model'),
  plate: requireString(body.plate, 'plate'),
  color: requireString(body.color, 'color'),
})

// Confirm the child row exists AND belongs to the caller before mutating it.
const assertOwned = async (finder, id, residentId) => {
  const record = await finder(id)
  if (!record || record.residentId !== residentId) throw ApiError.notFound('Not found')
}

// "My profile" — always scoped to the authenticated user's own residentId from
// the JWT, never a client-supplied id. Members cannot read or edit anyone else.
export const residentSelfController = {
  getMe: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    const resident = await ResidentModel.findById(residentId)
    if (!resident) throw ApiError.notFound('Resident not found')
    res.json(resident)
  }),
  updateMe: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    const data = {}
    for (const field of SELF_EDITABLE_FIELDS) {
      if (field in req.body) data[field] = req.body[field]
    }
    if ('dietary' in data) {
      if (!Array.isArray(data.dietary)) throw ApiError.badRequest('dietary must be a list')
      data.dietary = [...new Set(data.dietary.map((d) => String(d).trim()).filter(Boolean))]
    }
    const resident = await ResidentModel.update(residentId, data)
    res.json(resident)
  }),

  addFamilyMember: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    await ResidentModel.createFamilyMember(residentId, parseFamilyInput(req.body))
    res.status(201).json(await ResidentModel.findById(residentId))
  }),
  updateFamilyMember: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    await assertOwned(ResidentModel.findFamilyMember, req.params.id, residentId)
    await ResidentModel.updateFamilyMember(req.params.id, parseFamilyInput(req.body))
    res.json(await ResidentModel.findById(residentId))
  }),
  removeFamilyMember: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    await assertOwned(ResidentModel.findFamilyMember, req.params.id, residentId)
    await ResidentModel.removeFamilyMember(req.params.id)
    res.json(await ResidentModel.findById(residentId))
  }),

  addVehicle: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    await ResidentModel.createVehicle(residentId, parseVehicleInput(req.body))
    res.status(201).json(await ResidentModel.findById(residentId))
  }),
  updateVehicle: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    await assertOwned(ResidentModel.findVehicle, req.params.id, residentId)
    await ResidentModel.updateVehicle(req.params.id, parseVehicleInput(req.body))
    res.json(await ResidentModel.findById(residentId))
  }),
  removeVehicle: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    await assertOwned(ResidentModel.findVehicle, req.params.id, residentId)
    await ResidentModel.removeVehicle(req.params.id)
    res.json(await ResidentModel.findById(residentId))
  }),

  // Stamp the notices feed as seen "now" (server-controlled timestamp, not client-supplied).
  markNoticesSeen: asyncHandler(async (req, res) => {
    const residentId = requireLinkedResidentId(req)
    const resident = await ResidentModel.update(residentId, { noticesLastSeenAt: new Date() })
    res.json(resident)
  }),
}
