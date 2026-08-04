# Activity Log

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
- **Seed event dates are all in the past**: all 6 seeded community events (`evt-001`..`evt-006`) are dated 2026-07-18 through 2026-07-26, before the current date, so `/member/events` showed "No upcoming events" with no code-level bug. Worked around by creating a real future event ("Late Summer Rooftop Jazz Night", 2026-08-15) during testing — seed data should be refreshed with rolling/relative dates so the demo doesn't go stale again.

### Flows verified working end-to-end

- Member: facility booking, dining reservation, guest pass registration, event RSVP/cancel/RSVP, notices (read), profile update+persistence, cross-portal authz blocks (`/staff`, `/management` redirect correctly).
- Staff: booking approval, dining reservation confirmation, guest approve/check-in/check-out, facilities/dining/events dashboards.
- Management: dashboard analytics, event/notice/facility/restaurant creation, new-member + create-login flow (verified by logging in as the new member and completing the forced password-change gate).
- Auth: wrong-password rejection, portal-mismatch rejection, forgot-password request (safe messaging, no account enumeration), reset-password with invalid/missing token handled gracefully.
