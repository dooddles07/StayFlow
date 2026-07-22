import { StaffModel } from '../models/staff.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(StaffModel, 'Staff member')

// Matches src/lib/api/staff.ts: createStaffMember sends avatarSeed too (client-
// generated), updateStaffMember never touches it once set.
const CREATE_FIELDS = ['name', 'role', 'email', 'shift', 'avatarSeed']
const UPDATE_FIELDS = ['name', 'role', 'email', 'shift']

export const staffController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const item = await StaffModel.create(pickAllowed(req.body, CREATE_FIELDS))
    logAdminAction(req, 'CREATE', 'StaffMember', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const item = await StaffModel.update(req.params.id, pickAllowed(req.body, UPDATE_FIELDS))
    logAdminAction(req, 'UPDATE', 'StaffMember', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await StaffModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'StaffMember', req.params.id)
    res.status(204).send()
  }),
}
