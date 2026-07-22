import { EventModel } from '../models/event.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(EventModel, 'Event')

// Matches src/lib/api/event.ts's writable fields.
const FIELDS = ['title', 'category', 'description', 'image', 'date', 'time', 'endTime', 'location', 'capacity']

export const eventController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const item = await EventModel.create(pickAllowed(req.body, FIELDS))
    logAdminAction(req, 'CREATE', 'Event', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const item = await EventModel.update(req.params.id, pickAllowed(req.body, FIELDS))
    logAdminAction(req, 'UPDATE', 'Event', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await EventModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Event', req.params.id)
    res.status(204).send()
  }),
  rsvp: asyncHandler(async (req, res) => {
    const { residentId } = req.body
    if (!residentId) throw ApiError.badRequest('residentId is required')
    const event = await EventModel.findById(req.params.id)
    if (!event) throw ApiError.notFound('Event not found')

    // Capacity is a hard limit, not a UI hint — enforce it here so a direct API call
    // can't overbook. Already-attending residents re-confirming never count twice.
    const alreadyAttending = event.rsvps.some((r) => r.residentId === residentId)
    if (!alreadyAttending && event.rsvps.length >= event.capacity) {
      throw ApiError.conflict('This event is fully booked')
    }

    await EventModel.addAttendee(req.params.id, residentId)
    res.status(201).json(await EventModel.findById(req.params.id))
  }),
  cancelRsvp: asyncHandler(async (req, res) => {
    const { residentId } = req.body
    if (!residentId) throw ApiError.badRequest('residentId is required')
    await EventModel.removeAttendee(req.params.id, residentId)
    res.json(await EventModel.findById(req.params.id))
  }),
}
