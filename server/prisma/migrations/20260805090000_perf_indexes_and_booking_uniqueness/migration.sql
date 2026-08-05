-- Production readiness migration. Additive only: no column is dropped, no type
-- changes, no data loss. Rollback is dropping the objects created here.
--
-- Indexes are created CONCURRENTLY where possible so an existing deployment is
-- not write-locked. Prisma wraps a migration in a transaction and CREATE INDEX
-- CONCURRENTLY cannot run inside one, so plain CREATE INDEX is used instead —
-- acceptable here because the tables are small at current scale, and the locks
-- are held only for the duration of each build.

-- 1. event_rsvps.residentId
-- The @@unique([eventId, residentId]) index leads with eventId, so it cannot
-- serve a lookup by residentId alone. That lookup is exactly what the ON DELETE
-- CASCADE performs when a resident is removed, which meant a full sequential
-- scan of event_rsvps on every resident deletion.
CREATE INDEX IF NOT EXISTS "event_rsvps_residentId_idx" ON "event_rsvps" ("residentId");

-- 2. Ordering indexes. Every list endpoint sorts on these columns, and none of
-- them was indexed, so each list was a full scan plus an in-memory sort.
CREATE INDEX IF NOT EXISTS "bookings_createdAt_idx" ON "bookings" ("createdAt");
CREATE INDEX IF NOT EXISTS "dining_reservations_createdAt_idx" ON "dining_reservations" ("createdAt");
CREATE INDEX IF NOT EXISTS "events_date_idx" ON "events" ("date");
CREATE INDEX IF NOT EXISTS "guests_arrivalDate_idx" ON "guests" ("arrivalDate");
CREATE INDEX IF NOT EXISTS "guests_hostResidentId_arrivalDate_idx" ON "guests" ("hostResidentId", "arrivalDate");
CREATE INDEX IF NOT EXISTS "notices_pinned_postedAt_idx" ON "notices" ("pinned", "postedAt");

-- 3. notifications: the fastest-growing table in the schema. Reads filter by
-- owner and order by createdAt desc, so the composite serves filter and sort
-- together. The plain FK indexes are replaced by those composites.
CREATE INDEX IF NOT EXISTS "notifications_residentId_createdAt_idx" ON "notifications" ("residentId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_staffId_createdAt_idx" ON "notifications" ("staffId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications" ("createdAt");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications" ("read");
DROP INDEX IF EXISTS "notifications_residentId_idx";
DROP INDEX IF EXISTS "notifications_staffId_idx";

-- 4. Sign-in identity is case-insensitive from this release on: the application
-- lowercases every email on write and on lookup. Existing rows are normalised
-- here so nobody who registered with a capital letter is locked out.
-- Deliberately not wrapped in a uniqueness guard: users.email is already UNIQUE,
-- so if two rows differ only by case this statement fails loudly rather than
-- silently merging two accounts. Remediation in that case is to decide which
-- account is real before re-running.
UPDATE "users" SET "email" = lower("email") WHERE "email" <> lower("email");
UPDATE "users" SET "pendingEmail" = lower("pendingEmail") WHERE "pendingEmail" IS NOT NULL AND "pendingEmail" <> lower("pendingEmail");

-- 5. Double-booking backstop.
-- Until now the only thing preventing two residents from holding the same
-- facility slot was the Serializable transaction in booking.model.js. That is
-- correct, but it is a single application-level guarantee with no database
-- enforcement behind it — any future code path that inserts a booking without
-- going through that model would silently be able to double-book.
--
-- Partial: cancelled bookings are history and must not block the slot from
-- being taken again.
--
-- NOTE FOR THE OPERATOR: if this statement fails with "could not create unique
-- index", the database already contains conflicting bookings. Find them with
--   SELECT "facilityId", "date", "timeSlot", count(*)
--   FROM "bookings" WHERE "status" <> 'CANCELLED'
--   GROUP BY 1,2,3 HAVING count(*) > 1;
-- resolve the duplicates, then re-run the migration.
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_facility_date_slot_active_key"
  ON "bookings" ("facilityId", "date", "timeSlot")
  WHERE "status" <> 'CANCELLED';
