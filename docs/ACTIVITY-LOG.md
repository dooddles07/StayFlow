# Activity Log

Narrative record of what was done and why, newest first. `CHANGELOG.md` is the
terse list of what changed; this file is the reasoning behind it.

Last updated: 2026-08-05

## 2026-08-05 — Launch hardening pass

Second audit, this time aimed at the deploy itself. The security core held up:
no missing authn or authz, no committed secrets, no endpoint without a role
guard. What follows is what did not hold up.

**Shipped blind.** Sentry was enabled but the build emitted no source maps, so
every production stack trace was minified noise. Maps are published now — the
repo is public MIT source, so there is nothing in them to protect.

**The Cloudinary signature authorised too much.** It named only a folder and a
timestamp, so one signature was good for unlimited uploads of any file type for
Cloudinary's full validity window. It is now bound to a single generated
`public_id` and an image format allowlist, and the client rejects the obvious
cases before asking for one.

**Prisma error text reached the logs.** A previous pass stopped the whole error
object being dumped, but the same query argument values — residents' emails,
names, phone numbers — live inside `.message`, which was still logged. The
client now uses `errorFormat: 'minimal'` and the error middleware keeps only the
code and the offending column names for any Prisma error.

**The private portal was indexable.** `robots.txt` allowed everything, including
all three login screens and the password recovery forms.

**Rate limits were evadable.** The Render origin answers requests that never went
through the Vercel edge, so `X-Forwarded-For` was caller-controlled and every
per-IP budget with it. Over-long chains now share one bucket, and the flows worth
protecting — login, forgot-password, reset — are keyed on the account rather than
on an address, which no amount of address rotation helps.

**`script-src 'unsafe-inline'`** made the CSP unable to stop the injected script
it exists to stop. The router streams two inline scripts whose bodies change per
route, so hashing was not an option; it mints a nonce per request instead and the
matching policy goes out on the same response. That moved the policy out of
`vercel.json`, which cannot produce a per-request value.

**8.9 MB of hero PNGs** loaded above the fold on the landing page and every login
and recovery screen. Now 307 KB of WebP, with `scripts/convert-heroes.mjs`
keeping the conversion reproducible.

**The portal shell trusted localStorage.** The stored user object decides which
shell renders, and anyone with the console open can edit it. Every API call was
authorised server-side so no data was ever reachable, but a tampered role
rendered a management shell that looked like a breach. The three portal layouts
now check the httpOnly session cookie during SSR, and the store asks `/auth/me`
once per page load and takes the server's answer over the stored one. The email
is no longer persisted at all.

**Testing.** The suite went from 261 to 524. The gap was never the permission
model — the authorization matrix already covered that — but what happens inside
each endpoint: the booking slot conflict and its retry, the dining table hold and
release, the guest pass lifecycle, and the login lockout. Coverage is now gated
in CI, and a new job applies every migration to a real Postgres from empty and
fails if the partial unique index behind the double-booking guard is missing.
That index exists only as raw SQL, so nothing else would have noticed.

Also fixed: `DIRECT_URL` is required at boot rather than failing later during
`migrate deploy`; the drifted duplicate at `server/.env` is gone and no longer
read; the readiness probe caches a healthy result and no longer returns the raw
exception, which named the database host; image fields must be an https link or a
path on this site; a root error boundary catches throws from the providers that
sit outside every route.

## 2026-08-05 — Production readiness audit and remediation

Full hostile review of the deployed system: all 88 API endpoints, the Prisma schema, both deploy configs, and the frontend. The existing gates were already green going in (typecheck clean, 0 lint errors, 47 tests passing) — every finding below sat in a blind spot none of them cover: production-only code paths, deploy configuration, fail-open defaults, and behaviour under load or failure.

### Critical

- **Password-reset tokens were being written to the production log stream.** `mailer.js` logged the full reset link whenever `RESEND_API_KEY` was unset, `env.js` only warned about it, and `render.yaml` never declared the key. Net effect: anyone with Render log access held a live account-takeover token for every reset request, while no user could ever actually complete a reset. Now fails closed — the API refuses to boot in production without `RESEND_API_KEY` and `APP_URL`, and the mailer will not print a link outside development.
- **The HTML app shipped with no security headers at all.** helmet only ever covered the Express API; the frontend is served by Vercel, whose config had no `headers` block. No CSP, no HSTS, no frame protection — the portal was framable, so every authenticated action including the management destructive dialogs was clickjackable. Added a header set to `vercel.json`. (Correction, 2026-08-05: this entry originally claimed the headers were defined once in `scripts/security-headers.mjs` with a drift test. Neither file existed. The single definition and its drift test are real as of the pass below, and live in `src/lib/security-headers.ts` and `src/lib/security-headers.test.ts`.)
- **`buildCrudRouter` failed open.** `readRoles ? requireRole(...) : noop` meant a forgotten role list silently produced open access rather than closed. Five routers had omitted it. Role lists are now mandatory and the builder throws at boot; the intended roles are declared explicitly on every router, preserving existing behaviour exactly — proven by the new 151-case authorization matrix.
- **IDOR on notification delete.** Any STAFF user could delete any resident's or peer's notification; every sibling route on that model was owner-scoped. Fixed.

### High

- **Unwrapped async middleware was a remote process-kill.** `requireOwnerRecord` and `requireOwnNotification` were `async` but not wrapped in `asyncHandler`; Express 4 does not catch rejected promises, so a database hiccup on any of 9 routes became an unhandled rejection, which Node terminates on. On a single-instance plan that is a full outage.
- **Rate limiting keyed on the wrong IP.** `trust proxy` was 1 against a two-proxy chain (Vercel → Render), so `req.ip` resolved to a shared upstream address. The 10-attempt login limiter was therefore a _global_ budget — ten bad logins from anyone locked out every user. Now resolves the real client address, with a regression test driving forwarded chains.
- **Logout revoked nothing** — it cleared the cookie and left a captured bearer token valid for its remaining 7 days. Now bumps `tokenVersion`. Deliberate consequence: logout signs the user out on all devices.
- **The login response returned the JWT in the body**, handing page JavaScript the very thing the httpOnly cookie exists to withhold. The frontend never read it; removed.
- **`?limit=abc` returned a 500** (`Number('abc')` → `NaN` → Prisma `take: NaN`). Added a `validateQuery` middleware mirroring the existing `validateBody`.
- **Error responses and logs leaked internals** — unique-constraint violations echoed the constraint's column names to the client, and `console.error(err)` dumped whole Prisma errors, which embed the failing query's parameter values (emails, names, phone numbers).
- **5 MB request bodies were accepted on every endpoint**, including unauthenticated login. Now 100 kb by default, with the large limit scoped to the three routers that store base64 photos.

### Medium

Indexes for every list endpoint's `orderBy`, plus `event_rsvps.residentId` (whose absence made deleting a resident sequentially scan the table) and `(owner, createdAt)` composites on `notifications`. A partial unique index on `bookings` as a database-level backstop behind the application's Serializable double-booking check. Graceful shutdown with `server.close()` drain (deploys previously dropped in-flight requests). Structured JSON logging with request IDs and key redaction, replacing `morgan('dev')`. A readiness probe that actually touches the database. `Origin` checking as CSRF defence in depth. Per-flow rate limiters (five auth endpoints had shared one budget). Case-insensitive sign-in email. Response compression.

### Frontend

The three portal layouts rendered a bare `null` while auth resolved — a blank white page indistinguishable from a broken app. Toast live region made persistent so screen readers actually announce it, and `aria-current` added to nav. Recharts (~284 kB) removed from the member, staff and management dashboards: `kpi-card` was importing the whole charting library to draw a decorative sparkline, now an inline SVG whose curve is pinned by test to d3's `curveNatural` output. Recharts still backs the real charts on the analytics page.

Note: an earlier read of a stale `dist/` suggested recharts was un-split and that routes had no error boundaries. Both were wrong — the current build already code-splits it, and `defaultErrorComponent` in `router.tsx` boundaries every route. Measured before changing.

### Housekeeping

Removed a 136 kB committed AI-review diff dump, 546 lines of never-imported UI components, and three unused dependencies. Consolidated `toFullDate` (copy-pasted into five controllers) and the duplicated `AUTH_COOKIE` literal. Deleted two unrouted audit-log `list` helpers that were dead code guarding sensitive data. Made `env.js` resolve the root `.env` from its own module path, which removes the reason a byte-identical second copy of the live secrets existed at `server/.env`.

### Verification

Tests went from 47 to 258. CI gained `npm audit` and a tracked-file secret scan as separate jobs. The database migration was dry-run against the real schema inside a transaction that rolls back — every statement valid, no duplicate bookings blocking the new unique index, nothing persisted. UI verified in Playwright across login, dashboard, logout and the auth redirect, with a before/after comparison confirming the sparkline swap is visually faithful.

## 2026-08-04 — Real-product copy pass, full QA sweep, toast system replaced

Ran a full functional QA pass across all three portals (auth permutations, cross-role authorization blocks, CRUD flows per portal, account lockout, login rate limiting) plus a copy pass removing "demo" framing app-wide, per request to make the deployed instance read as a real product rather than a portfolio demo shell.

### Toast notifications were completely broken app-wide (found during QA, root-caused, fixed)

Every `toast.success()`/`toast.error()` call in the app — 28 call sites, every portal — silently did nothing. No visual symptom beyond "nothing happens after save," easy to miss without deliberately checking.

Root cause, confirmed via direct instrumentation of the `sonner` package: `<Toaster>`'s mount effect (`useEffect(() => ToastState.subscribe(...), [])`) never fired, so its internal subscriber count stayed at 0 regardless of how many toasts were pushed. Verified this wasn't a false read by exposing the `Observer` instance on `window` and checking `subscribers.length` directly (bypassing console logging, which was itself unreliable — see below). Ruled out, in order: HMR/dev-cache artifacts (full server restarts + cleared Vite dep cache, still broken), module duplication (only one `sonner` copy in `node_modules`, confirmed via `npm ls`), a sonner 2.x regression (downgraded to the stable 1.7.4 line — identical failure), `ClientOnly`-forced fresh mounting (still broken), and StrictMode double-invoke breaking the subscribe/cleanup pattern (a hand-rolled reproduction of the exact same pattern worked correctly). No thrown exception at any point — confirmed uncaught errors in this exact async context are visible via a calibration throw, so this was a silent no-op, not a crash.

Replaced sonner entirely with an in-house store (`src/lib/toast.ts` + `src/components/ui/toast-viewport.tsx`) built on `useSyncExternalStore` — React's own primitive for external state + SSR, which sidesteps this whole bug class. Same `toast.success/error/info(message, { description? })` call shape, so only the import path changed at all 28 call sites. Verified working end-to-end after the fix, live, across member/staff/management flows.

Also caught mid-investigation: `browser_evaluate`-injected `console.log` calls were unreliable for diagnosis in this environment — likely intercepted by `@tanstack/devtools-vite`'s console-pipe panel before reaching the outer console listener. Direct state inspection (exposing objects on `window`) was the reliable technique; noting this since it cost real debugging time before the switch.

### "Demo" framing removed app-wide

- Management login splash: replaced three fabricated KPI numbers (`96% Occupancy`, `72 NPS`, `3 Open tickets` — no ticket or survey system exists in this app) with the same capability-bullet-list pattern already used on the staff/member login splashes.
- Login footers ("Demo access — ask your administrator") and the portal-picker footer ("Demo data. Sign in...") reworded to real-product phrasing; no functional change (self-registration was already off).
- README "Try It Live" section and `docs/SECURITY.md`'s sample-login section reworded away from "demo accounts" language; the actual security disclosures (shared writable DB, rotate before real use) are unchanged, just no longer prefixed with "demo."
- Removed the now-fully-dead `demo` prop and "Demo data" badge from `SectionHeader` — no caller has passed it since the analytics charts were converted to real data.

### QA findings that were not bugs (worth recording so they aren't re-investigated)

- Local dev quirk: Nitro's dev server claims port 4000 by default regardless of the frontend's `--port 3000` flag, colliding with the backend's own port 4000. Not a code bug — just start the backend first and let the frontend fall back to 4001, temporarily widening `CORS_ORIGIN` for the session.
- `npm run build`'s `prisma generate` step can fail with `EPERM` on Windows if a running `node --watch server/server.js` still has the query-engine DLL open. Stop the backend first.

### Verification

`lint`, `lint:server`, `typecheck`, `test` (42/42), and `build` all pass. Full manual QA: 3-portal auth matrix, all 6 cross-role authorization blocks, member facility/dining/guest/event/profile flows, staff booking/guest approval, management resident create-login + forced-password-change gate + account lockout (5 fails → 429), login rate limiting (confirmed live by hitting it). Test data created during the pass was cleaned up afterward.

## 2026-08-04 — Full code + security review, oversized-file refactor

Ran a full code review (backend security audit, backend code-quality pass, frontend review — 3 parallel agents, read-only) since there was no open PR/diff to review against; this covered the whole codebase as it stood. Fixed the findings, then independently re-verified every fix with a second round of agents before closing out.

### Security fixes

1. **CSV formula injection** (`src/lib/export-csv.ts`) — report exports didn't neutralize cells starting with `=+-@`; a resident/guest-controlled name or note field could execute as a formula (e.g. `=HYPERLINK(...)`) when a manager opened the export in Excel/Sheets. Fixed by prefixing such cells with `'` before quoting.
2. **Login timing side-channel** (`server/src/controllers/auth.controller.js`) — the unknown-email path returned immediately, skipping `bcrypt.compare` entirely, while the wrong-password path ran it — the timing gap let an attacker enumerate valid emails despite the generic error message. Fixed with a dummy bcrypt compare against a fixed hash on the unknown-email path.
3. **`server/scripts/reset-test-passwords.js` had no safe production guard**, in two passes. First pass added a guard gated on `NODE_ENV=production`; an independent re-verification agent caught that this stack has no separate local database, so local dev normally runs with `NODE_ENV=development` against the same production `DATABASE_URL` — the guard would never fire in the actual risk scenario. Second pass replaced it with an unconditional `--force` requirement.
4. **Notification delete skipped the admin audit log** (`server/src/controllers/notification.controller.js`) — every other controller's `remove()` calls `logAdminAction`; this one didn't. Fixed to match the sibling pattern.
5. **Cookie-decode crash** (`server/src/middleware/auth.middleware.js`) — a malformed percent-encoded `stayflow_token` cookie threw an uncaught `URIError`, returning a generic 500 instead of the intended 401. Fixed with a try/catch treating decode failure as "no token."
6. **Missing `aria-label`s** on the Edit/Delete icon buttons in `management/users.tsx` (residents + staff, mobile and desktop) — added, matching the pattern already used on `facilities.tsx`/`events.tsx`.

Deliberately left as-is (documented tradeoffs, not bugs): `mailer.js`'s console-log fallback when `RESEND_API_KEY` is unset (hard-failing startup risks bricking deploys over one email feature); the unused `AdminActionEventModel.list`/`AuthEventModel.list` read helpers (building a real audit-log screen is a new feature, not a fix); `reset-password.tsx`'s password-toggle UI (turned out not to be true duplication of the shared `PasswordInput` component — only one toggle drives both fields).

### Refactor: split two oversized route files

`src/routes/management/users.tsx` (683 lines) → route file now 379 lines, split into `src/components/stayflow/users/` (`residents-tab.tsx`, `staff-tab.tsx`, `resident-form-sheet.tsx`, `staff-form-sheet.tsx`, `user-action-dialogs.tsx`, `login-status-badge.tsx`, `types.ts`).

`src/routes/member/profile.tsx` (942 lines) → route file now 517 lines, split into `src/components/stayflow/profile/` (`avatar-dialog.tsx`, `family-dialog.tsx`, `vehicle-dialog.tsx`, `delete-button.tsx`, `email-section.tsx`, `profile-helpers.tsx`).

Pure extraction — same behavior, same JSX, props threaded through. Verified with `tsc --noEmit`, `eslint`, the full Vitest suite (44/44 passing throughout), and a live dev-server check confirming both routes load with zero console errors. A follow-up review agent independently re-checked the diff for prop-wiring/behavior regressions (swapped callback args, dropped guards, changed conditionals, duplicated/drifted constants) and found none.

## 2026-07-30 — Full production QA pass (stay-flow-alpha.vercel.app)

Manual end-to-end testing against the live production deployment (Vercel + Render + Neon), using realistic data across all three portals. Data created during this pass was left in place intentionally (bookings, guest pass, dining reservation, event, notice, facility, restaurant, new member account) to reflect genuine usage.

### Bugs found and fixed

1. **Login 401 hijacked by stale-session interceptor** (`src/lib/api/client.ts`) — the global 401 handler fired for every 401 response, including `/auth/login` itself. If a stale user was already persisted in `localStorage` (e.g. a leftover session) and a login attempt failed, the app showed a "session expired" toast and redirected to the stale user's portal login instead of showing the login form's own "Invalid credentials" error on the page the user was actually on. Fixed by excluding `/auth/login` from the interceptor.

2. **Unlabeled approve/reject icon buttons** (`src/routes/staff/bookings.tsx`, `src/routes/management/facilities.tsx`) — icon-only buttons (approve/reject bookings, edit/delete facilities) had no `aria-label` or visible text, so screen readers announced nothing. Added descriptive `aria-label`s matching the pattern already used correctly in `restaurants.tsx`, `events.tsx`, and `notices.tsx`.

### Known issues not fixed (flagged for follow-up)

- **Corrupted booking record**: booking `cmrlv06ut0001w3mwx3fsq038` (Serenity Yoga Deck, 2026-08-01) has `timeSlot` stored as `7:00 AM <U+FFFD> 8:30 AM` — the en-dash was replaced with the Unicode replacement character at write time (likely a direct API call bypassing the UI, since the UI's slot constants are correctly encoded in `src/lib/booking-slots.ts`). The booking PUT endpoint only allows updating `status`, so this can't be corrected via the API — needs a direct DB fix (Prisma Studio) or a new migration if more rows are affected.
- ~~**Seed event dates are all in the past**~~ — resolved. `server/prisma/seed.js` now dates its event with `daysFromNow(14)`, so a fresh seed always produces an upcoming event.

### Flows verified working end-to-end

- Member: facility booking, dining reservation, guest pass registration, event RSVP/cancel/RSVP, notices (read), profile update+persistence, cross-portal authz blocks (`/staff`, `/management` redirect correctly).
- Staff: booking approval, dining reservation confirmation, guest approve/check-in/check-out, facilities/dining/events dashboards.
- Management: dashboard analytics, event/notice/facility/restaurant creation, new-member + create-login flow (verified by logging in as the new member and completing the forced password-change gate).
- Auth: wrong-password rejection, portal-mismatch rejection, forgot-password request (safe messaging, no account enumeration), reset-password with invalid/missing token handled gracefully.
