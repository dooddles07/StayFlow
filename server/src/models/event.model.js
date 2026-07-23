import { prisma } from '../config/db.js'

// Nothing reads more than residentId off an rsvp — the client's own attendee-name
// lookups go through a separately-fetched resident directory (see staff/events.tsx),
// so pulling each attendee's full resident row (email, phone, emergency contacts...)
// here was pure unused PII exposure on every event list/detail fetch.
const includeRsvps = { rsvps: { select: { residentId: true } } }

export const EventModel = {
  // No retention policy on events — bounded `take` so this can't become an unbounded
  // full-table dump as the community's history accumulates (same reasoning as
  // NotificationModel.findAll; this list is reachable by every authenticated role).
  findAll: () => prisma.communityEvent.findMany({ include: includeRsvps, orderBy: { date: 'asc' }, take: 500 }),
  findById: (id) => prisma.communityEvent.findUnique({ where: { id }, include: includeRsvps }),
  create: (data) => prisma.communityEvent.create({ data, include: includeRsvps }),
  update: (id, data) => prisma.communityEvent.update({ where: { id }, data, include: includeRsvps }),
  remove: (id) => prisma.communityEvent.delete({ where: { id } }),
  addAttendee: (id, residentId) =>
    prisma.eventRsvp.upsert({
      where: { eventId_residentId: { eventId: id, residentId } },
      update: {},
      create: { eventId: id, residentId },
    }),
  removeAttendee: (id, residentId) =>
    prisma.eventRsvp.deleteMany({ where: { eventId: id, residentId } }),
}
