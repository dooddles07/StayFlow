# StayFlow — Changelog

> Full history: `git log`. This file curates notable changes; not every commit is listed.

## 2026-08-05 — Free-tier scale work, image offload, observability, handover docs

Everything here holds the $0/month hosting bill. See [HANDOVER.md](HANDOVER.md) for the resulting operating limits.

- **feat(upload):** photos no longer live in Postgres. `POST /uploads/signature` (MANAGEMENT only, 30 per 15 min) returns a Cloudinary signature and the browser uploads the file directly, so only a URL reaches the API. No SDK: the signature is SHA-1 over `folder` + `timestamp` via `node:crypto`. Missing credentials return 503, never an unsigned upload.
- **perf(server):** removed the 5 mb body carve-out on `/events`, `/facilities` and `/restaurants`. It existed solely for base64 photo data URIs; every endpoint now holds a flat 100 kb limit.
- **feat(db):** split pooled and direct Neon connections. `DATABASE_URL` uses the PgBouncer host with `connection_limit=5`; `DIRECT_URL` uses the direct host, because Prisma Migrate needs a real session for advisory locks and DDL. Without the split, `migrate deploy` breaks on the pooled host.
- **feat(observability):** Sentry on the API (`server/instrument.mjs`, loaded via `node --import` so its instrumentation patches modules before express or prisma load) and in the browser (`src/lib/observability.ts`). Errors only, 5xx only, request bodies and headers stripped before send. Inert without a DSN.
- **feat(retention):** `startRetentionSweeper()` prunes `auth_events` past 90 days and read notifications past 180, hourly, on unref'd timers. Unread notifications are never pruned. Closes the unbounded-growth risk previously tracked in SECURITY.md.
- **perf(auth):** password-reset mail is no longer awaited. The response is generic either way, so waiting on Resend only pinned an unauthenticated request open for the provider's round trip. Email-change mail is still awaited, since a failure there returns a 400 the user needs to see.
- **chore(prisma):** moved CLI config to `server/prisma.config.ts`, replacing the `package.json#prisma` block that Prisma 7 removes. The config file also disables the CLI's own `.env` loading, so it loads the repo-root file by module-relative path.
- **fix(events):** `endTime` accepts `null`. The column is `endTime String?` and the admin form sends `null` to clear it, but the schema was `z.string().optional()`, which takes `undefined` and rejects `null` — so saving any event without an end time returned a 400.
- **fix(upload):** surface Cloudinary's rejection reason instead of a flat "try again". A `403 missing permissions (actions=["create"])` was indistinguishable from a corrupt file.
- **fix(ci):** `no-unexpected-multiline` failure in `authorization.matrix.test.js`. Prettier wrapped `request(app)[method](path)` so a line began with `[`, an ASI hazard.
- **chore(cleanup):** deleted the merged API+SSR+static Node server (`scripts/start.mjs` and its security-header module). The nitro plugin moved build output to `.output/` while that entry still imported `dist/server`, so `npm start` had been broken; neither Vercel nor Render invoked it. Also removed `.cursorrules`, `docs/superpowers/`, a one-off data-repair script, and ~40 MB of stale local build artifacts.
- **docs:** new [HANDOVER.md](HANDOVER.md) covering services, credential locations and rotation, the four interacting free-tier budgets, and a break-fix runbook. README rewritten with a real developer section. ARCHITECTURE, SECURITY and CHANGELOG brought back in line with the split deployment.

## 2026-07-22 — Security audit, management-issued logins, performance pass

- **feat(auth):** replace resident self-registration with management-issued logins — `POST /auth/register` removed entirely; `POST /residents/:id/create-login` (MANAGEMENT only) generates a temp password and returns it once. Residents must set their own password on first login (`mustChangePassword`, enforced server-side on every non-auth endpoint) via the existing change-password or reset-password flow, either of which clears the flag.
- **feat(management):** Users page — login-status column, per-row "Create Login" action, and an "also create a login now" option on Add Member; one-time password-reveal dialog with copy-to-clipboard.
- **fix(auth):** closed an account-takeover hole where the (now-removed) public registration endpoint would link a login to any resident by guessing sequential resident ids — superseded by removing self-registration outright.
- **fix(server):** allowlist fields on admin CRUD (residents/staff/facilities/restaurants/tables) — closes a mass-assignment gap where a STAFF/MANAGEMENT caller could set fields no client UI exposes.
- **feat(server):** admin action audit trail (`admin_action_events`) — logs every admin CREATE/UPDATE/DELETE on residents/staff/facilities/restaurants/tables/notices.
- **perf(server):** paginate/narrow high-growth list endpoints (notifications, bookings, dining reservations, guests), dedupe ownership-check double-fetches, add composite indexes on `bookings` and `dining_tables`.
- **chore(config):** consolidate two divergent `.env` files (root + `server/.env`, different `JWT_SECRET` values) into a single root `.env` — `server/.env` deleted; Prisma CLI now invoked from root with an explicit schema path instead of relying on a second env file.
- **fix(member):** add a "Not you? Log out" escape from the forced-password-change gate, matching the sibling no-resident-linked screen.
- **fix(scripts):** `reset-test-passwords.js` now loads the repo `.env` by file-relative path — works regardless of invocation cwd instead of relying on an implicit cwd-relative load.
- **fix(staff):** full audit and hardening pass across the staff portal — guest check-in/check-out now enforces the `PENDING → APPROVED → CHECKED_IN → CHECKED_OUT` state machine server-side (closing a bypass where a guest could be checked out without ever checking in); bookings/dining/facilities/guests time-of-day sorting fixed (was comparing raw non-zero-padded time strings, e.g. `"9:00 AM"` sorting after `"10:00 AM"`); the dining table map now refreshes after a status change instead of going stale; booking rejection requires confirmation (matching the existing dining decline pattern); double-submit races on status-changing actions closed across bookings/dining/facilities/guests with a ref-backed busy guard (state alone can't catch two clicks before React re-renders).
- **fix(staff):** narrowed the resident data fetched by the events attendee list to `{id, name, unit}` — the full resident directory response (email, phone, emergency contacts, family, vehicles) was being held in page state for fields never rendered.
- **fix(staff):** added busy-state spinner feedback to the booking approve/reject icon buttons — previously only `disabled`, with no visible in-flight indicator.
- **docs:** documented that the staff-portal Access Matrix is server-enforced RBAC only, not staff-UI coverage — STAFF has real API write access to restaurants/tables/events/notices/residents with no corresponding `/staff/*` screens yet (see [RULES.md](RULES.md)).
- **feat(ui):** photographic hero backgrounds — landing page, all three login screens, and the member dashboard welcome banner now use full-bleed photography (`public/images/hero/`) behind the existing color-wash overlays, replacing flat CSS-only gradients/patterns. Shared across verify-email/reset-password/forgot-password (same visual system as the member login).
- **feat(brand):** wired in the finished Flow-S vector logomark, favicon (SVG + multi-res ICO), and app icons, replacing the placeholder mark that had shipped in `public/` since scaffolding.
- **fix(booking,dining):** force `status: 'PENDING'` on create regardless of client input, and strip any client-supplied `tableId` on dining create — closed a bypass where a member could self-confirm a booking or self-assign any dining table (including an already-occupied one) via a direct API call, skipping the atomic slot-conflict/table-assignment checks entirely.
- **fix(server):** allowlist notice and event fields on create/update (`postedAt`/`postedBy` always server-set) — the same mass-assignment gap closed for residents/staff/facilities/restaurants/tables earlier today had missed these two resources.
- **fix(server):** narrow `GET /residents` to a list-appropriate projection (`id/name/email/unit/tier/phone/moveInDate/user`) — was returning the full resident row, including dietary/emergency-contacts/family/vehicles, to every management list/analytics/report view that only ever reads a handful of fields. Detail fetches (`GET /residents/:id`, `/residents/me`) are unaffected.
- **fix(server):** allowlist guest create fields — `checkedInAt`/`checkedOutAt` were not stripped from a member-supplied request body, letting a caller fabricate check-in/check-out history on a brand-new guest pass.
- **fix(ui):** closed double-submit races on create/save/delete actions across the member portal (guests, dining, facility booking) and the full management portal (users, facilities, restaurants, notices, events) with the same ref-backed guard pattern used for staff — several of these (management create/save flows) had no guard at all beyond a disabled button, which doesn't block a second click before React re-renders.
- **docs:** documented the email-change flow (`/auth/change-email` → `/auth/confirm-email`) in RULES.md — implemented but previously undocumented; added the booking/dining "status forced to PENDING on create" rule; added events to the admin-allowlisting resource list.

## 2026-08-04 — Full code + security review, frontend component split

- **fix(security):** close CSV formula-injection vector in report exports (`src/lib/export-csv.ts`) — cells starting with `=+-@` are now prefixed with `'` before quoting.
- **fix(security):** close login timing side-channel (`auth.controller.js`) — unknown-email logins now run a dummy bcrypt compare, closing the gap that let response time distinguish "no such account" from "wrong password."
- **fix(security):** `reset-test-passwords.js` now requires `--force` unconditionally instead of gating on `NODE_ENV=production` — this stack has no separate local database, so `NODE_ENV` was never a reliable signal that the script's `DATABASE_URL` was safe to write to.
- **fix(audit):** `notification.controller.js`'s `remove` now logs to `admin_action_events`, matching every sibling delete endpoint (it was the one silent exception).
- **fix(reliability):** `auth.middleware.js` cookie parsing no longer throws an uncaught `URIError` on a malformed percent-encoded cookie — treated as "no token" (401) instead of a 500.
- **fix(a11y):** added `aria-label`s to the Edit/Delete icon buttons on the management Users page (residents + staff, mobile and desktop views).
- **refactor(frontend):** split `src/routes/management/users.tsx` (683 lines) into `src/components/stayflow/users/` (tabs, form sheets, action dialogs — route file now 379 lines) and `src/routes/member/profile.tsx` (942 lines) into `src/components/stayflow/profile/` (avatar/family/vehicle dialogs, delete button, email section, shared helpers — route file now 517 lines). Pure extraction, independently re-verified against the original for prop-wiring and behavior regressions.
- **process:** ran a full code review (backend security audit, backend code-quality pass, frontend review) plus an independent re-verification pass on all fixes above.

## 2026-08-04 — Toast system replaced, real-product copy pass, full QA sweep

- **fix(critical):** every `toast()` call in the app (28 call sites, all 3 portals) was silently doing nothing — `sonner`'s `<Toaster>` never received its mount effect under this app's SSR shell, so it never had a live subscriber. Replaced sonner entirely with an in-house store on `useSyncExternalStore` (`src/lib/toast.ts` + `src/components/ui/toast-viewport.tsx`); same call shape, all 28 sites updated. See `docs/ARCHITECTURE.md` and `docs/ACTIVITY-LOG.md` for the full root-cause writeup.
- **feat(security):** general rate limiter on all of `/api` (300 req/15min/IP), on top of the existing route-specific limiters.
- **fix(analytics):** management dashboard/analytics charts now derive dining trend and member engagement from real bookings/reservations/guests data, closing the last mock-data surface in the app (`lib/mock/analytics.ts` deleted).
- **chore(copy):** removed "demo" framing app-wide — management login splash's three fabricated KPIs replaced with the same capability-bullet pattern used on staff/member login; login footers, portal picker, and README/SECURITY.md sample-login language reworded to real-product phrasing. No security disclosures were softened, only the "just a demo" framing.
- **chore(cleanup):** removed the now-dead `demo` prop/badge from `SectionHeader` (no caller since the analytics fix above).
- **process:** full manual QA pass — 3-portal auth matrix, all 6 cross-role authorization blocks, member/staff/management CRUD flows, account lockout, login rate limiting — all verified live.

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

- `KpiCard` component (`src/components/stayflow/kpi-card.tsx`) established as the shared stat-tile primitive.
- Profile page fix.
- Table overflow-x-auto pattern adopted for wide data tables.

## Security fixes

- Broken-access-control gap closed 2026-07-15 (see [SECURITY.md](SECURITY.md)).
- Account-takeover via public self-registration closed 2026-07-22, by removing self-registration entirely (see [SECURITY.md](SECURITY.md)).
- Mass-assignment gap on admin CRUD closed 2026-07-22 (field allowlisting).
- CSV formula injection, login timing side-channel, and an unguarded `reset-test-passwords.js` closed 2026-08-04 (see [SECURITY.md](SECURITY.md)).
