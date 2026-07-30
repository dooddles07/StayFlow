# Activity Log

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
