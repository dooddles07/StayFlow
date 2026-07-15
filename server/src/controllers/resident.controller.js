import { ResidentModel } from '../models/resident.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const residentController = buildCrudController(ResidentModel, 'Resident')

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
]

const requireLinkedResidentId = (req) => {
  const residentId = req.user?.residentId
  if (!residentId) throw ApiError.notFound('No resident profile is linked to this account')
  return residentId
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
    const resident = await ResidentModel.update(residentId, data)
    res.json(resident)
  }),
}
