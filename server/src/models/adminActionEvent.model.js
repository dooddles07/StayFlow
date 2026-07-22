import { prisma } from '../config/db.js'

export const AdminActionEventModel = {
  record: (data) => prisma.adminActionEvent.create({ data }),
  list: ({ resourceType, resourceId, limit = 100 } = {}) =>
    prisma.adminActionEvent.findMany({
      where: { ...(resourceType ? { resourceType } : {}), ...(resourceId ? { resourceId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    }),
}
