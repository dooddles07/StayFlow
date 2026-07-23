import { prisma } from '../config/db.js'

// The client only ever reads restaurant/resident id+name and table id+label+seats off
// a reservation (see ReservationApiResponse in src/lib/api/diningReservation.ts) —
// selecting just that instead of the full related rows avoids dragging every
// restaurant field and resident PII along with each row.
const reservationSelect = {
  id: true,
  restaurantId: true,
  residentId: true,
  tableId: true,
  date: true,
  time: true,
  partySize: true,
  occasion: true,
  dietary: true,
  seating: true,
  status: true,
  createdAt: true,
  restaurant: { select: { id: true, name: true } },
  resident: { select: { id: true, name: true } },
  table: { select: { id: true, label: true, seats: true } },
}

export const DiningReservationModel = {
  // No retention policy on reservations — bounded `take` so this can't become an
  // unbounded full-table dump as history accumulates (same reasoning as
  // NotificationModel.findAll).
  findAll: ({ limit = 500 } = {}) =>
    prisma.diningReservation.findMany({ select: reservationSelect, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 1000) }),
  findById: (id) => prisma.diningReservation.findUnique({ where: { id }, select: reservationSelect }),
  // Bounded same as findAll above — one resident's own history can't grow unbounded in
  // practice, but capping keeps this consistent with every other list query in the app.
  findByResident: (residentId) =>
    prisma.diningReservation.findMany({ where: { residentId }, select: reservationSelect, take: 500 }),
  create: (data) => prisma.diningReservation.create({ data, select: reservationSelect }),
  update: (id, data) => prisma.diningReservation.update({ where: { id }, data, select: reservationSelect }),
  remove: (id) => prisma.diningReservation.delete({ where: { id } }),

  setTableStatus: (tableId, status) => prisma.diningTable.update({ where: { id: tableId }, data: { status } }),

  // Finding the smallest fitting table and reserving it were two separate statements —
  // two reservations confirmed at once could both see the same AVAILABLE table before
  // either commits. Serializable isolation makes Postgres detect that overlap and fail
  // one side with P2034 ("write conflict, retry"); retried once here, same approach as
  // BookingModel.createIfNoConflict for the equivalent facility-slot race. Returns null
  // both when nothing fits and when contention couldn't be resolved after retry — from
  // the caller's perspective both mean "no table available right now."
  assignTableIfAvailable: async (restaurantId, minSeats) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const table = await tx.diningTable.findFirst({
              where: { restaurantId, status: 'AVAILABLE', seats: { gte: minSeats } },
              orderBy: { seats: 'asc' },
            })
            if (!table) return null
            await tx.diningTable.update({ where: { id: table.id }, data: { status: 'RESERVED' } })
            return table
          },
          { isolationLevel: 'Serializable' },
        )
      } catch (err) {
        if (err.code !== 'P2034') throw err
        if (attempt === 1) return null
      }
    }
  },
}
