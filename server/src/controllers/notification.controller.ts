import type { Request, Response } from 'express'
import * as NotificationModel from '../models/notification.model.js'

export async function list(_req: Request, res: Response) {
  res.json(await NotificationModel.listNotifications())
}

export async function markRead(req: Request, res: Response) {
  res.json(await NotificationModel.markNotificationRead(req.params.id!))
}

export async function markAllRead(_req: Request, res: Response) {
  await NotificationModel.markAllNotificationsRead()
  res.status(204).end()
}
