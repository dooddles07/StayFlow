import { prisma } from '../lib/prisma.js'

export function listNotifications() {
  return prisma.notification.findMany({ orderBy: { createdAt: 'desc' } })
}

export function markNotificationRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true } })
}

export function markAllNotificationsRead() {
  return prisma.notification.updateMany({ where: { read: false }, data: { read: true } })
}

export interface NotificationInput {
  kind: string
  title: string
  body: string
}

export function createNotification(input: NotificationInput) {
  return prisma.notification.create({ data: input })
}
