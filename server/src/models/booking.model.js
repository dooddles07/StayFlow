import { prisma } from '../config/db.js'

export const BookingModel = {
  findAll: () => prisma.booking.findMany({ include: { facility: true, resident: true }, orderBy: { createdAt: 'desc' } }),
  findById: (id) => prisma.booking.findUnique({ where: { id }, include: { facility: true, resident: true } }),
  findByResident: (residentId) => prisma.booking.findMany({ where: { residentId }, include: { facility: true } }),
  // No resident PII — just enough for the slot picker to know what's taken.
  // Bounded to today-forward: the picker only offers the next 14 days, so past
  // bookings are dead weight and the result set can't grow without bound.
  findByFacility: (facilityId) => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    return prisma.booking.findMany({
      where: { facilityId, status: { not: 'CANCELLED' }, date: { gte: startOfToday } },
      select: { date: true, timeSlot: true, status: true },
    })
  },
  // Checking for a conflict and then creating are two separate statements — run as
  // plain queries, two requests for the same slot can both pass the check before
  // either commits, and both succeed. Serializable isolation makes Postgres detect
  // that overlap and fail one side with P2034 ("write conflict, retry"); retried once
  // here, and if it still can't resolve, treated the same as a real conflict — return
  // null rather than let a 500 leak out for what is, from the caller's perspective,
  // just someone else taking the slot first.
  createIfNoConflict: async (data) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const conflict = await tx.booking.findFirst({
              where: { facilityId: data.facilityId, date: data.date, timeSlot: data.timeSlot, status: { not: 'CANCELLED' } },
            })
            if (conflict) return null
            return tx.booking.create({ data, include: { facility: true, resident: true } })
          },
          { isolationLevel: 'Serializable' },
        )
      } catch (err) {
        if (err.code !== 'P2034') throw err
        if (attempt === 1) return null
      }
    }
  },
  create: (data) => prisma.booking.create({ data, include: { facility: true, resident: true } }),
  update: (id, data) => prisma.booking.update({ where: { id }, data, include: { facility: true, resident: true } }),
  remove: (id) => prisma.booking.delete({ where: { id } }),
}
