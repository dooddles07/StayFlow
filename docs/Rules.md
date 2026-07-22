# StayFlow — Business Rules

> Data model backing these rules: [Schema.md](Schema.md). Endpoint-level enforcement: [Architecture.md](Architecture.md#api-documentation). Threat model: [Security.md](Security.md).

## Authentication & Authorization

- **Scheme:** hand-rolled JWT (no Passport/NextAuth). Payload: `{sub,email,role,residentId,staffId,tokenVersion,mustChangePassword}`, default expiry `7d`.
- **Transport:** `Set-Cookie stayflow_token` — `httpOnly`, `sameSite=lax`, `secure` in prod, `maxAge 7d`. JWT never touches JS; frontend persists only the non-sensitive user profile. `Authorization: Bearer` also accepted.
- **Verification (`requireAuth`):** verify signature → load auth state → reject if user missing, `!isActive`, or `tokenVersion` mismatch (password reset/change bumps `tokenVersion`, instantly revoking old sessions).
- **Guards:** `requireRole(...roles)`, `requireOwnResidentParam`/`requireOwnResidentBody` (forces own `residentId`), `requireOwnStaffParam` (MANAGEMENT free pass, STAFF must match own id, MEMBER forbidden), `requireOwnerRecord(model, ownerField)` (loads record, checks ownership for MEMBER only, stashes it on `req.record` so downstream handlers don't re-fetch), `requireOwnNotification` (dual-owner: `residentId` for MEMBER, `staffId` for STAFF), `blockIfMustChangePassword` (403s every non-`/auth` route while a resident is still on a MANAGEMENT-issued temp password).
- **Account protection:** lock 15 min after 5 consecutive failed logins (per-account, defeats IP rotation); disabled-account state only revealed to someone with the correct password.
- **No self-registration, for anyone.** There is no public account-creation endpoint. STAFF/MANAGEMENT accounts are created manually (seed / Prisma Studio). Resident logins are issued by MANAGEMENT — see "Resident onboarding" below.

## Resident onboarding (no self-registration)

A resident never creates their own login. The real-world flow this models: the resident visits the front desk/management office in person, and MANAGEMENT creates their portal login on the spot.

1. A `Resident` profile can be created by STAFF or MANAGEMENT (reserves the unit; no login yet) — or a MANAGEMENT user can create the profile and issue the login together in one step.
2. `POST /residents/:id/create-login` (**MANAGEMENT only** — stricter than the STAFF+MANAGEMENT gate on the rest of the resident directory) generates a random temp password, hashes it, and creates the `User` row with `mustChangePassword: true`. The plaintext password is returned exactly once in the response — never persisted, never retrievable again — for management to relay to the resident in person.
3. The resident signs in with that temp password. Until they set their own, `blockIfMustChangePassword` 403s every endpoint except `/auth/me`, `/auth/logout`, and `/auth/change-password` — the client redirects them straight to a forced "set your password" screen.
4. Setting a real password — via the normal in-app change-password flow, **or** via the public forgot-password/reset-password flow — clears `mustChangePassword`. Both count equally as "the resident proved they own the account."
5. A resident can only ever have one login: `create-login` 409s if the resident already has one, or if the email collides with an unrelated existing account.

## User Roles

| Role | Portal | Can do |
| --- | --- | --- |
| **Guest (unauthenticated)** | login pages, landing | Log in, request/reset password |
| **MEMBER** (resident) | `/member/*` | Manage own bookings, dining, guests, event RSVPs; read facilities/events/notices/notifications |
| **STAFF** | `/staff/*` | All bookings/dining/guests (list, confirm, check-in/out), manage facilities/restaurants/tables/events/notices |
| **MANAGEMENT** | `/management/*` | Everything Staff + manage staff directory & residents + issue resident logins + analytics/reports |

### Access Matrix (write)

| Resource | MEMBER | STAFF | MANAGEMENT |
| --- | --- | --- | --- |
| Own bookings/dining/guests | ✅ | ✅ | ✅ |
| All bookings/dining/guests | ❌ | ✅ | ✅ |
| Facilities / Restaurants / Tables / Events / Notices | ❌ | ✅ | ✅ |
| Residents directory | ❌ | ✅ | ✅ |
| Staff directory | ❌ | ❌ | ✅ |

This matrix is server-enforced RBAC, not a map of what the staff portal's UI exposes. STAFF genuinely has API write access to restaurants/tables/events/notices/residents (confirmed at the route level), but `/staff/*` currently has no screens for restaurant/table management, event/notice authoring, or resident profile editing — those actions are only reachable through the management portal today. A STAFF login hitting those endpoints directly would succeed; there's just no button for it. Worth a deliberate call (build the missing staff UI vs. accept management-only as the intended scope) rather than treating it as a docs bug — the permissions themselves are correct as written above.

## Ownership rules

- A member can only ever act on records where `residentId` matches their own JWT — enforced server-side (`requireOwnResidentBody`/`requireOwnerRecord`), not just hidden in the UI.
- Bookings and dining reservations: `residentId` is **forced from the JWT** on create, never trusted from the request body.

## Admin write allowlisting & audit trail

- Admin CRUD (residents, staff, facilities, restaurants, tables, notices) only ever writes an explicit allowlist of fields per resource, never a raw spread of the request body — closes a mass-assignment gap where a STAFF/MANAGEMENT caller could otherwise set fields no client UI exposes (e.g. a resident's `moveInDate` or `avatarSeed` via a direct API call to the update endpoint).
- Every `CREATE`/`UPDATE`/`DELETE` on those same resources is logged to the `admin_action_events` table (actor id/email/role, action, resource type/id, timestamp) — an immutable trail of who changed what, separate from `auth_events`. No FK to `users`, same reasoning as `auth_events`: history must survive account deletion.

## Booking / capacity rules

- **Party size** must be a positive integer, validated both client and server side.
- **Capacity enforcement:** party size is checked server-side against the facility's capacity or the restaurant's max party size — a client-side bypass cannot exceed it.
- **Capacity/max-party-size values** are clamped to positive integers at the management layer (can't configure a facility with capacity 0 or negative).
- **Slot-conflict check is atomic:** wrapped in a serializable DB transaction to close a double-booking race under concurrent requests for the same slot. Dining table assignment on reservation confirm uses the same pattern (find smallest fitting table + reserve it in one serializable transaction, retried once on write conflict) so two reservations confirmed at once can't both land on the same table.
- **Per-restaurant max party size** replaces an earlier hardcoded cap — each restaurant defines its own realistic limit.
- **Table release on delete:** deleting a dining reservation releases its assigned table so it doesn't stay permanently stranded as occupied.

## Guest pass lifecycle

```
PENDING --(staff approves)--> APPROVED --(staff check-in)--> CHECKED_IN --(staff check-out)--> CHECKED_OUT
```

- Member registers a guest → `passNumber` + QR issued.
- Only STAFF/MANAGEMENT can approve, check in, or check out.
- Member can create/edit their own guest records; cannot self-approve or self-check-in.

## Session / SSR rules

- Server-side rendering forwards the auth cookie and resolves an absolute API URL — without this, a page refresh on a detail route can falsely 404 because SSR has no session context.
- On a `401` from the API, the client redirects to login rather than leaving a dead portal shell rendered.

## Notices / Notifications

- Notices and notifications are readable by any authenticated user; only STAFF/MANAGEMENT can create/delete them.
- Notifications support per-user read state (`/:id/read`).

## Payments

> No payment or billing rules exist — out of scope for current implementation. See [PRD.md](PRD%20%28Product%20Requirements%20Document%29.md) roadmap.
