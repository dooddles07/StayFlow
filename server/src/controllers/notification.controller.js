import { NotificationModel } from '../models/notification.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    res.json(await NotificationModel.findAll())
  }),
  byResident: asyncHandler(async (req, res) => {
    res.json(await NotificationModel.findByResident(req.params.residentId))
  }),
  byStaff: asyncHandler(async (req, res) => {
    res.json(await NotificationModel.findByStaff(req.params.staffId))
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json(await NotificationModel.create(req.body))
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
    res.status(204).send()
  }),
}
