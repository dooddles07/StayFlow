import { prisma } from '../config/db.js'

export const AuthEventModel = {
  record: (data) => prisma.authEvent.create({ data }),
  list: ({ userId, type, limit = 100 } = {}) =>
    prisma.authEvent.findMany({
      where: { ...(userId ? { userId } : {}), ...(type ? { type } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    }),
}
