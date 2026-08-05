import { NotificationModel } from '../models/notification.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const CREATE_FIELDS = ['kind', 'title', 'body', 'residentId', 'staffId']

// Coerced and bounded by notificationListQuerySchema in the route chain, so this
// is either a valid positive integer or absent — never NaN.
const limitOf = (req) => req.validatedQuery?.limit

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    res.json(await NotificationModel.findAll({ limit: limitOf(req) }))
  }),
  byResident: asyncHandler(async (req, res) => {
    res.json(
      await NotificationModel.findByResident(req.params.residentId, {
        limit: limitOf(req),
      }),
    )
  }),
  byStaff: asyncHandler(async (req, res) => {
    res.json(
      await NotificationModel.findByStaff(req.params.staffId, {
        limit: limitOf(req),
      }),
    )
  }),
  // No client currently calls this (grep confirms zero frontend usage) — hardened anyway
  // rather than left as a raw, unvalidated `req.body` spread on a staffOnly write endpoint.
  create: asyncHandler(async (req, res) => {
    const data = pickAllowed(req.body, CREATE_FIELDS)
    if (typeof data.kind !== 'string' || !data.kind.trim())
      throw ApiError.badRequest('kind is required')
    if (typeof data.title !== 'string' || !data.title.trim())
      throw ApiError.badRequest('title is required')
    if (typeof data.body !== 'string' || !data.body.trim())
      throw ApiError.badRequest('body is required')
    if (!!data.residentId === !!data.staffId)
      throw ApiError.badRequest('Provide exactly one of residentId or staffId.')

    const notification = await NotificationModel.create(data)
    logAdminAction(req, 'CREATE', 'Notification', notification.id)
    res.status(201).json(notification)
  }),
  markRead: asyncHandler(async (req, res) => {
    res.json(await NotificationModel.markRead(req.params.id))
  }),
  markAllRead: asyncHandler(async (req, res) => {
    await NotificationModel.markAllReadForResident(req.params.residentId)
    res.status(204).send()
  }),
  markAllReadStaff: asyncHandler(async (req, res) => {
    await NotificationModel.markAllReadForStaff(req.params.staffId)
    res.status(204).send()
  }),
  markAllReadGlobal: asyncHandler(async (req, res) => {
    await NotificationModel.markAllRead()
    res.status(204).send()
  }),
  remove: asyncHandler(async (req, res) => {
    await NotificationModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Notification', req.params.id)
    res.status(204).send()
  }),
}
