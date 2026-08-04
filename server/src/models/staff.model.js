import { prisma } from '../config/db.js'

export const StaffModel = {
  findAll: () => prisma.staffMember.findMany({ orderBy: { name: 'asc' } }),
  findById: (id) => prisma.staffMember.findUnique({ where: { id } }),
  create: (data) => prisma.staffMember.create({ data }),
  update: (id, data) => prisma.staffMember.update({ where: { id }, data }),
  // Same reasoning as ResidentModel.remove: users.staffId is onDelete:Restrict so a
  // login is never silently orphaned — drop the linked login in the same transaction
  // rather than leaving deletion permanently blocked by it.
  remove: (id) =>
    prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { staffId: id } })
      await tx.staffMember.delete({ where: { id } })
    }),
}
