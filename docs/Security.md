# StayFlow — Security

> Auth/authorization rules: [Rules.md](Rules.md). Report a vulnerability: see [Support.md](Support.md).

## Controls

| Control | Implementation |
| --- | --- |
| Authentication | JWT in httpOnly cookie, `tokenVersion` revocation |
| Authorization | `requireRole` + ownership guards; broken-access-control gap closed 2026-07-15 |
| Self-registration | **None.** No public account-creation endpoint exists. STAFF/MANAGEMENT accounts are seed/Prisma-Studio only; resident logins are issued by MANAGEMENT via `POST /residents/:id/create-login` (temp password, shown once) — see [Rules.md](Rules.md#resident-onboarding-no-self-registration) |
| Forced password change | MANAGEMENT-issued resident logins carry `mustChangePassword: true`; a dedicated middleware 403s every non-auth endpoint until it's cleared by the resident setting their own password |
| Admin write allowlisting | Admin CRUD (residents/staff/facilities/restaurants/tables/notices) writes an explicit field allowlist per resource — closes a mass-assignment gap fixed 2026-07-22 |
| Admin audit trail | `admin_action_events` logs every admin CREATE/UPDATE/DELETE (actor, action, resource) — added 2026-07-22 |
| Password hashing | bcrypt cost 12 (login/reset/resident-login-issuance); seed + dev password-reset script use 10 |
| Password policy | 8–72 bytes enforced (bcrypt truncation guarded) |
| Brute-force | per-IP rate limits + per-account 5-fail / 15-min lock |
| Enumeration | generic forgot-password + login responses (doesn't reveal which part failed) |
| Secrets | env-only, required at boot, never in tracked files |
| Security headers | helmet (HSTS, nosniff, frameguard); CORP disabled to let CORS govern |
| CORS | explicit allowlist; wildcard+credentials refused (fails closed to same-origin) |
| SQL injection | Prisma parameterized queries only |
| XSS | httpOnly cookie keeps JWT out of JS; React escaping |
| CSRF | `sameSite=lax` cookie |
| Reset tokens | 32-byte random, SHA-256 hashed at rest, single-use, 1-hour TTL |

> **CSRF note:** `sameSite=lax` mitigates cross-site cookie use, but no anti-CSRF token exists. Add CSRF tokens if introducing cookie-based state-changing HTML forms.

## Environment variables

Backend requires `DATABASE_URL` + `JWT_SECRET` (process exits at boot if missing). Frontend reads `VITE_*` at build.

**Single `.env` at repo root — there is deliberately no `server/.env`.** Prisma CLI commands must be run from root with an explicit schema path using server's own pinned binary, not a bare `bunx prisma` (which resolves a fresh, possibly incompatible major version): `./server/node_modules/.bin/prisma <command> --schema=server/prisma/schema.prisma`. The standalone backend dev server (`cd server && npm run dev`) needs these vars supplied another way (or run from root) since it won't find a `.env` in `server/`.

| Variable | Scope | Purpose | Required | Example / placeholder |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | server | Postgres connection (Prisma) — already the public proxy host in this project, not Railway's internal-only address | ✅ | `postgresql://user:password@host:5432/db` |
| `JWT_SECRET` | server | JWT signing secret | ✅ | `<random-32+-byte-secret>` |
| `JWT_EXPIRES_IN` | server | Token lifetime | optional (`7d`) | `7d` |
| `PORT` | server | API port | optional (`4000`/`3000`) | `4000` |
| `CORS_ORIGIN` | server | Comma-list allowlist; empty = same-origin only | optional | `http://localhost:3000,https://app.example` |
| `APP_URL` | server | Base URL for reset links | optional | `http://localhost:3000` |
| `NODE_ENV` | server | `production` toggles secure cookie / prod mailer | optional | `production` |
| `VITE_API_URL` | frontend | API base (defaults `/api`) | optional | `https://…/api` |
| `SEED_PASSWORD` | script | Seed users' password | optional (random) | `********` |
| `TEST_PASSWORD` | script | Reset demo passwords | required for script | `********` |

## Secret placeholders

| Service | Placeholder |
| --- | --- |
| Database | `postgresql://user:password@host:5432/db` |
| JWT secret | `<random-32+-byte-secret>` |
| Email provider (Resend) | `RESEND_API_KEY` — unset means console-log fallback, not an error |
| Redis / AWS / Firebase / Twilio / Stripe / Google / GitHub / OpenAI | `<not used>` |

**Never expose real secrets.** All live values belong in Railway service env vars, never in tracked files.

## Demo logins (development / preview only)

| Portal | Login page | Email |
| --- | --- | --- |
| Member | `/login/member` | `member@stayflow.io` |
| Staff | `/login/staff` | `staff@stayflow.io` |
| Management | `/login/management` | `admin@stayflow.io` |

The live demo password is shown in the root README's "Try It Live" section — seeded test accounts, not real user data. **Rotate before any production use** via the password-reset flow or `server/scripts/reset-test-passwords.js` (set `TEST_PASSWORD`).

## Third-party services

| Category | Status |
| --- | --- |
| Hosting | Railway (single service, prod) |
| Database | PostgreSQL (Railway-managed) |
| Payment / SMS / Maps / Analytics SaaS / AI / Cloud storage / OAuth / Webhooks | None wired |
| Email | Resend, via `utils/mailer.js` — sends when `RESEND_API_KEY` is set, otherwise logs the link to console (dev and prod alike) |

## Logging / audit trail

- `auth_events` table records `LOGIN_SUCCESS`/`FAILED`/`LOCKED`/`DISABLED`, `LOGOUT`, `PASSWORD_RESET_REQUEST`/`SUCCESS`, `PASSWORD_CHANGE`, `EMAIL_CHANGE_REQUEST`/`SUCCESS` with ip + user-agent; immutable, no FK to `users` so history survives account deletion. (`REGISTER` remains a valid historical value on old rows from before self-registration was removed 2026-07-22 — no longer emitted.)
- `admin_action_events` table records every admin CREATE/UPDATE/DELETE on residents/staff/facilities/restaurants/tables/notices (actor id/email/role, action, resource type/id); same immutable, no-FK design, added 2026-07-22.
- HTTP access logged via `morgan('dev')`.
- No monitoring / tracing / APM configured.

## AI assistant restrictions (this repo)

- No customer personal data (names, contacts, account numbers, transactions) may be pasted into AI tooling without approved exemption.
- No credentials (passwords, API keys, tokens, connection strings) may be pasted into AI tooling.

## Reporting a vulnerability

See [Support.md](Support.md) for contact path. Do not open a public issue for undisclosed vulnerabilities.
