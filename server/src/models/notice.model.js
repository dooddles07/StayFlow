import { prisma } from '../config/db.js'

export const NoticeModel = {
  // No retention policy on notices — bounded `take` so this can't become an unbounded
  // full-table dump as the community's history accumulates (same reasoning as
  // NotificationModel.findAll; this list is reachable by every authenticated role).
  findAll: () => prisma.notice.findMany({ orderBy: [{ pinned: 'desc' }, { postedAt: 'desc' }], take: 500 }),
  findById: (id) => prisma.notice.findUnique({ where: { id } }),
  create: (data) => prisma.notice.create({ data }),
  update: (id, data) => prisma.notice.update({ where: { id }, data }),
  remove: (id) => prisma.notice.delete({ where: { id } }),
}
