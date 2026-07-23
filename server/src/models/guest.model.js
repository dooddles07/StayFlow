import { prisma } from '../config/db.js'

// The client only ever reads hostResident id+name off a guest (see GuestApiResponse
// in src/lib/api/guest.ts) — selecting just that instead of the full resident row
// avoids dragging the host's PII along with each row.
const guestSelect = {
  id: true,
  name: true,
  hostResidentId: true,
  purpose: true,
  vehiclePlate: true,
  arrivalDate: true,
  arrivalTime: true,
  passNumber: true,
  status: true,
  checkedInAt: true,
  checkedOutAt: true,
  hostResident: { select: { id: true, name: true } },
}

export const GuestModel = {
  // No retention policy on guest passes — bounded `take` so this can't become an
  // unbounded full-table dump as history accumulates (same reasoning as
  // NotificationModel.findAll).
  findAll: ({ limit = 500 } = {}) =>
    prisma.guest.findMany({ select: guestSelect, orderBy: { arrivalDate: 'desc' }, take: Math.min(limit, 1000) }),
  findById: (id) => prisma.guest.findUnique({ where: { id }, select: guestSelect }),
  // Bounded same as findAll above — one resident's own history can't grow unbounded in
  // practice, but capping keeps this consistent with every other list query in the app.
  findByResident: (hostResidentId) =>
    prisma.guest.findMany({ where: { hostResidentId }, orderBy: { arrivalDate: 'desc' }, take: 500 }),
  findByPassNumber: (passNumber) => prisma.guest.findUnique({ where: { passNumber } }),
  create: (data) => prisma.guest.create({ data, select: guestSelect }),
  update: (id, data) => prisma.guest.update({ where: { id }, data, select: guestSelect }),
  remove: (id) => prisma.guest.delete({ where: { id } }),
}
