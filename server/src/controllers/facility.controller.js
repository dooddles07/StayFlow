import { FacilityModel } from '../models/facility.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(FacilityModel, 'Facility')

// Matches src/lib/api/facility.ts's FacilityInput. setFacilityStatus sends only a
// {status, statusReason} subset — pickAllowed only copies keys actually present, so
// that partial update still works without listing it separately.
const FIELDS = ['name', 'category', 'description', 'rules', 'image', 'capacity', 'openHours', 'location', 'rating', 'status', 'statusReason']

export const facilityController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const item = await FacilityModel.create(pickAllowed(req.body, FIELDS))
    logAdminAction(req, 'CREATE', 'Facility', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const item = await FacilityModel.update(req.params.id, pickAllowed(req.body, FIELDS))
    logAdminAction(req, 'UPDATE', 'Facility', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await FacilityModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Facility', req.params.id)
    res.status(204).send()
  }),
}
