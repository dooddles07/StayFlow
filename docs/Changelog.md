# StayFlow — Changelog

> Full history: `git log`. This file curates notable changes; not every commit is listed.

## 2026-07-22 — Security audit, management-issued logins, performance pass

- **feat(auth):** replace resident self-registration with management-issued logins — `POST /auth/register` removed entirely; `POST /residents/:id/create-login` (MANAGEMENT only) generates a temp password and returns it once. Residents must set their own password on first login (`mustChangePassword`, enforced server-side on every non-auth endpoint) via the existing change-password or reset-password flow, either of which clears the flag.
- **feat(management):** Users page — login-status column, per-row "Create Login" action, and an "also create a login now" option on Add Member; one-time password-reveal dialog with copy-to-clipboard.
- **fix(auth):** closed an account-takeover hole where the (now-removed) public registration endpoint would link a login to any resident by guessing sequential resident ids — superseded by removing self-registration outright.
- **fix(server):** allowlist fields on admin CRUD (residents/staff/facilities/restaurants/tables) — closes a mass-assignment gap where a STAFF/MANAGEMENT caller could set fields no client UI exposes.
- **feat(server):** admin action audit trail (`admin_action_events`) — logs every admin CREATE/UPDATE/DELETE on residents/staff/facilities/restaurants/tables/notices.
- **perf(server):** paginate/narrow high-growth list endpoints (notifications, bookings, dining reservations, guests), dedupe ownership-check double-fetches, add composite indexes on `bookings` and `dining_tables`.
- **chore(config):** consolidate two divergent `.env` files (root + `server/.env`, different `JWT_SECRET` values) into a single root `.env` — `server/.env` deleted; Prisma CLI now invoked from root with an explicit schema path instead of relying on a second env file.

## Unreleased / Recent

- **fix(dining):** make table assignment on confirm atomic — closes a double-booking race on dining tables under concurrent requests, same pattern as the facility-slot fix below.
- **fix(management):** wire notification bell to a live cross-property feed, remove the dead mock store (and the ~10 seed-data files behind it) entirely.
- **fix(management):** wire dashboard/analytics to live data; flag the two charts that can't be (no revenue-tracking schema yet) as demo data instead of presenting them as real.
- **fix(management):** wire Users page to live API; add staff delete protection (`onDelete: Restrict`, closing a gap where a staff record could be deleted while its login silently orphaned).

- **fix(ssr):** forward auth cookie and resolve absolute API URL during server-side rendering — fixes false 404 on facility/dining detail page refresh.
- **fix(booking):** make slot-conflict check atomic with a serializable transaction — closes a double-booking race under concurrent requests.
- **fix(management):** clamp facility capacity and restaurant max party size to positive integers.
- **fix(booking):** enforce party size against facility capacity and restaurant max party size, server-side.
- **fix(booking):** validate party size as a positive integer, client and server.
- **fix(dining):** release assigned table when a reservation is deleted — prevents permanently stranded tables.
- **fix(member):** clear message for accounts with no resident profile linked, instead of dead-end retry loops.
- **fix(auth):** redirect to login on 401 instead of leaving a dead portal shell.
- **docs:** rewrote README as client-facing overview, moved technical deep-dive into structured docs (this file and its siblings) — supersedes `docs/technical-overview.md`.
- **docs:** unmasked demo login password in README (portfolio project, seeded test accounts only).

## Feature milestones

- **feat(dining):** realistic per-restaurant max party size, replacing a hardcoded cap of 12.
- **feat(member):** dining confirm step, RSVP filter on events, unread filter on notices.
- **perf(member):** shared TTL read cache with in-flight dedupe and write invalidation.
- **feat(member):** collapsible show/hide toggle + full booking/reservation history sections (completed/cancelled, sortable).
- **feat(notifications):** live per-resident notification bell with scoped read / mark-all.
- **feat(nav):** unread badge on Notices nav item (sidebar + mobile).
- **feat(search):** global Cmd+K search, portal-isolated, matching each portal's nav categories.
- **fix(a11y):** skip link, larger touch targets, password visibility toggle, structured guest arrival-time picker.
- **feat(dashboard):** live Open-Meteo weather/sunset data, replacing mocked values.
- **feat:** responsive pass — data tables collapse to stacked cards on mobile.
- **feat:** abstract SVG hero art for facilities, restaurants, and events.
- **feat(server):** Express + Prisma MVC backend with JWT auth for all StayFlow resources (initial backend, reverted once then reapplied after fixes).
- **feat:** built out Member, Staff, and Management portals (dashboards, facilities, dining, guests, events, notices, analytics/reports).
- **chore:** scaffolded TanStack Start app with shadcn/ui, Tailwind v4, sonner, Recharts, zustand.

## 2026-07-15 — UI redesign pass

- New stat-tile, `.reveal`, and `.ambient-wash` primitives.
- Profile page fix.
- Table overflow-x-auto pattern adopted for wide data tables.

## Security fixes

- Broken-access-control gap closed 2026-07-15 (see [Security.md](Security.md)).
- Account-takeover via public self-registration closed 2026-07-22, by removing self-registration entirely (see [Security.md](Security.md)).
- Mass-assignment gap on admin CRUD closed 2026-07-22 (field allowlisting).
