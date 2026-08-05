# StayFlow — Security

> Auth/authorization rules: [RULES.md](RULES.md).

## Controls

| Control                  | Implementation                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication           | JWT in httpOnly cookie **only** — the token is no longer returned in the login response body, so no page script can read it. `tokenVersion` revocation checked on every request                                                                                                                                                                                         |
| Authorization            | `requireRole` + ownership guards. `buildCrudRouter` now **requires** explicit `readRoles`/`writeRoles` and throws at boot if either is missing — omitting one used to mean "open to every authenticated user". Enforced by a 151-case route matrix (`authorization.matrix.test.js`) (2026-08-05)                                                                        |
| Logout                   | Revokes server-side by bumping `tokenVersion`, so a captured bearer token stops working immediately instead of staying valid for its full 7 days. **Signs the user out on all devices** — deliberate for a portal holding resident data (2026-08-05)                                                                                                                    |
| Self-registration        | **None.** No public account-creation endpoint exists. STAFF/MANAGEMENT accounts are seed/Prisma-Studio only; resident logins are issued by MANAGEMENT via `POST /residents/:id/create-login` (temp password, shown once) — see [RULES.md](RULES.md#resident-onboarding-no-self-registration)                                                                            |
| Forced password change   | MANAGEMENT-issued resident logins carry `mustChangePassword: true`; a dedicated middleware 403s every non-auth endpoint until it's cleared by the resident setting their own password                                                                                                                                                                                   |
| Admin write allowlisting | Admin CRUD (residents/staff/facilities/restaurants/tables/notices) writes an explicit field allowlist per resource — closes a mass-assignment gap fixed 2026-07-22                                                                                                                                                                                                      |
| Admin audit trail        | `admin_action_events` logs every admin CREATE/UPDATE/DELETE (actor, action, resource) — added 2026-07-22                                                                                                                                                                                                                                                                |
| Password hashing         | bcrypt cost 12 everywhere — login/reset/resident-login-issuance, seed, and the dev password-reset script all import the same `BCRYPT_ROUNDS` constant                                                                                                                                                                                                                   |
| Password policy          | 8–72 bytes enforced (bcrypt truncation guarded)                                                                                                                                                                                                                                                                                                                         |
| Brute-force              | per-IP rate limits + per-account 5-fail / 15-min lock                                                                                                                                                                                                                                                                                                                   |
| API abuse                | general limiter on all of `/api` (300 req / 15 min / IP), on top of the tighter per-route limiters above. Limiters resolve the client address through the two-proxy chain (Vercel → Render); trusting only one hop keyed everyone to a shared upstream IP, turning the 10-attempt login limit into a global budget any visitor could exhaust for all users (2026-08-05) |
| Request size             | 100 kb default body limit; the 5 mb allowance is scoped to the three routers that store base64 photos (`/events`, `/facilities`, `/restaurants`) rather than applied to every endpoint including unauthenticated login (2026-08-05)                                                                                                                                     |
| Enumeration              | generic forgot-password + login responses; unknown-email login runs a dummy bcrypt compare so it isn't timing-distinguishable from a wrong-password attempt (fixed 2026-08-04)                                                                                                                                                                                          |
| CSV export injection     | report exports prefix any cell starting with `=+-@` with `'` before quoting — closes a formula-injection vector where a resident/guest-controlled name/note field could execute as a formula when a manager opens the export in Excel/Sheets (fixed 2026-08-04)                                                                                                         |
| Secrets                  | env-only, required at boot, never in tracked files                                                                                                                                                                                                                                                                                                                      |
| Security headers         | **API:** helmet (HSTS, nosniff, frameguard); CORP disabled to let CORS govern. **HTML app:** full set incl. CSP and `frame-ancestors 'none'`, defined once in `scripts/security-headers.mjs`, mirrored into `vercel.json`, with a test asserting the two never drift. Before 2026-08-05 the HTML app had no headers at all — helmet only ever covered `/api`            |
| CORS                     | explicit allowlist; wildcard+credentials refused (fails closed to same-origin)                                                                                                                                                                                                                                                                                          |
| SQL injection            | Prisma parameterized queries only                                                                                                                                                                                                                                                                                                                                       |
| XSS                      | httpOnly cookie keeps JWT out of JS; React escaping                                                                                                                                                                                                                                                                                                                     |
| CSRF                     | `sameSite=lax` cookie + JSON-only body parser, plus an `Origin` allowlist check on every state-changing method (`originCheck.middleware.js`, 2026-08-05)                                                                                                                                                                                                                |
| Reset tokens             | 32-byte random, SHA-256 hashed at rest, single-use, 1-hour TTL. **Never logged** — the mailer refuses to print the link outside development, and the API will not boot in production without `RESEND_API_KEY` (2026-08-05)                                                                                                                                              |
| Error responses          | Generic messages only. A unique-constraint violation no longer echoes the constraint's column names, and unhandled errors return `{error, requestId}` while the detail goes to the structured log (2026-08-05)                                                                                                                                                          |
| Log redaction            | The structured logger redacts any key matching `pass                                                                                                                                                                                                                                                                                                                    | secret | token | authorization | cookie | apikey` at any depth, so a spread user row or request body cannot carry credentials into log aggregation (2026-08-05) |

> **CSRF note:** the primary protection remains `sameSite=lax` plus the JSON-only body parser. The `Origin` check is defence in depth so that a single future change — a switch to `sameSite=none`, or adding a urlencoded parser — cannot remove all protection at once. Requests carrying no `Origin` (server-to-server, SSR, health probes) are allowed: the CSRF threat model depends on a victim's browser attaching the cookie automatically.

> **Password-reset delivery is now fail-closed.** Previously, an unset `RESEND_API_KEY` in production meant reset links were `console.log`'d instead of emailed — putting live single-use account-takeover tokens into the Render log stream while no user could ever complete a reset. The API now refuses to start without `RESEND_API_KEY` and `APP_URL` when `NODE_ENV=production`.

## Environment variables

Backend requires `DATABASE_URL` + `JWT_SECRET` (process exits at boot if missing). Frontend reads `VITE_*` at build.

**Single `.env` at repo root.** `server/src/config/env.js` resolves that file from its own module path, so the API finds it whether it is started from the repo root or from `server/`. This replaced a bare `dotenv/config`, which resolved against `process.cwd()` and therefore only worked from the root — the workaround for which had been a second, byte-identical copy of the live secrets at `server/.env`. That duplicate is no longer needed and should be deleted; the legacy path is still read as a fallback so an existing checkout does not break.

Prisma CLI commands must be run from root with an explicit schema path using server's own pinned binary, not a bare `npx prisma` (which resolves a fresh, possibly incompatible major version): `./server/node_modules/.bin/prisma <command> --schema=server/prisma/schema.prisma`.

| Variable           | Scope    | Purpose                                                                             | Required                 | Example / placeholder                       |
| ------------------ | -------- | ----------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------- |
| `DATABASE_URL`     | server   | Postgres connection (Prisma) — the public proxy host, not an internal-only address  | ✅                       | `postgresql://user:password@host:5432/db`   |
| `JWT_SECRET`       | server   | JWT signing secret                                                                  | ✅                       | `<random-32+-byte-secret>`                  |
| `JWT_EXPIRES_IN`   | server   | Token lifetime                                                                      | optional (`7d`)          | `7d`                                        |
| `PORT`             | server   | API port                                                                            | optional (`4000`/`3000`) | `4000`                                      |
| `CORS_ORIGIN`      | server   | Comma-list allowlist; empty = same-origin only                                      | optional                 | `http://localhost:3000,https://app.example` |
| `APP_URL`          | server   | Base URL for reset links; also the allowed `Origin` for writes                      | **required in prod**     | `http://localhost:3000`                     |
| `RESEND_API_KEY`   | server   | Transactional email. Unset in prod = boot failure (see fail-closed note above)      | **required in prod**     | `re_…`                                      |
| `MAIL_FROM`        | server   | Sender address; must be a Resend-verified domain in production                      | optional (sandbox)       | `StayFlow <no-reply@yourdomain>`            |
| `NODE_ENV`         | server   | `production` toggles secure cookie, prod mailer, JSON logs, 2-hop proxy trust       | optional                 | `production`                                |
| `LOG_LEVEL`        | server   | `debug`/`info`/`warn`/`error`/`silent`; defaults to `info` in prod, `debug` locally | optional                 | `info`                                      |
| `TRUST_PROXY_HOPS` | server   | Override the proxy-chain depth used to resolve the client IP for rate limiting      | optional (`2` in prod)   | `2`                                         |
| `VITE_API_URL`     | frontend | API base (defaults `/api`)                                                          | optional                 | `https://…/api`                             |
| `SEED_PASSWORD`    | script   | Seed users' password                                                                | optional (random)        | `********`                                  |
| `TEST_PASSWORD`    | script   | Reset sample-account passwords                                                      | required for script      | `********`                                  |

## Secret placeholders

| Service                                                             | Placeholder                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Database                                                            | `postgresql://user:password@host:5432/db`                         |
| JWT secret                                                          | `<random-32+-byte-secret>`                                        |
| Email provider (Resend)                                             | `RESEND_API_KEY` — unset means console-log fallback, not an error |
| Redis / AWS / Firebase / Twilio / Stripe / Google / GitHub / OpenAI | `<not used>`                                                      |

**Never expose real secrets.** All live values belong in the Render dashboard's env vars, never in tracked files.

## Sample logins

| Portal     | Login page          | Email                |
| ---------- | ------------------- | -------------------- |
| Member     | `/login/member`     | `member@stayflow.io` |
| Staff      | `/login/staff`      | `staff@stayflow.io`  |
| Management | `/login/management` | `admin@stayflow.io`  |

The published password is shown in the root README's "Try It Live" section — seeded test accounts, not real user data. **Rotate before any production use** via the password-reset flow or `server/scripts/reset-test-passwords.js` (set `TEST_PASSWORD`, run with `--force` — this stack has no separate local database, so the script always targets whatever `DATABASE_URL` is in `.env`; `NODE_ENV` is not a reliable "is this prod" signal here and the guard doesn't trust it).

**Known tradeoff:** all three sample logins have full write access to the live database — anyone with the published password can create, edit, or delete real rows (residents, bookings, notices, and so on). No automated reset job is configured, so the live instance can be left in a messy state by a visitor. Accepted for a portfolio project; revisit (scheduled reset job, or read-only sample accounts) before this codebase backs a real building.

## Third-party services

| Category                                                                      | Status                                                                                                                                                                      |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting                                                                       | Render (API, free plan) + Vercel (frontend, free plan) — Vercel proxies `/api/*` to Render                                                                                  |
| Database                                                                      | PostgreSQL on Neon (free tier), connection set via `DATABASE_URL` on Render                                                                                                 |
| Payment / SMS / Maps / Analytics SaaS / AI / Cloud storage / OAuth / Webhooks | None wired                                                                                                                                                                  |
| Email                                                                         | Resend, via `utils/mailer.js` — sends when `RESEND_API_KEY` is set. Without a key the API refuses to boot in production; in development only, the link is logged to console |

## Logging / audit trail

- `auth_events` table records `LOGIN_SUCCESS`/`FAILED`/`LOCKED`/`DISABLED`, `LOGOUT`, `PASSWORD_RESET_REQUEST`/`SUCCESS`, `PASSWORD_CHANGE`, `EMAIL_CHANGE_REQUEST`/`SUCCESS` with ip + user-agent; immutable, no FK to `users` so history survives account deletion. (`REGISTER` remains a valid historical value on old rows from before self-registration was removed 2026-07-22 — no longer emitted.)
- `admin_action_events` table records every admin CREATE/UPDATE/DELETE on residents/staff/facilities/restaurants/tables/notices (actor id/email/role, action, resource type/id); same immutable, no-FK design, added 2026-07-22.
- HTTP access logged as one JSON object per line (`utils/logger.js`), with method, path, status, duration, client IP, and the authenticated user id/role. Replaced `morgan('dev')`, whose ANSI-coloured, timestamp-less, IP-less output no log aggregator could parse.
- Every request carries an `X-Request-Id` (generated, or inherited from an upstream `X-Request-Id`). It is echoed on the response and included in the 500 body, so a user-reported failure can be tied to its log line.
- Audit-write failures are logged at `error` level with enough context to reconstruct the missing row. They used to be swallowed to a console line — an audit trail with silent gaps cannot be relied on afterwards.
- No monitoring / tracing / APM configured.

### Remaining risks

| Risk                                 | Why it is accepted for now                                                                                                                                                                                                                                 | What would fix it                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `script-src` keeps `'unsafe-inline'` | TanStack Start emits its hydration payload as an inline `<script>`, and Vercel's static headers cannot carry a per-request nonce. Every other CSP directive is strict, and `frame-ancestors 'none'` closes the clickjacking hole the header set exists for | Nonce or hash-based CSP emitted per response by the SSR layer  |
| Rate-limit counters are in-memory    | Per-instance, reset on deploy. Correct on the current single-instance free plan                                                                                                                                                                            | Redis store once more than one instance runs                   |
| `auth_events` retention is unbounded | Rows hold email, IP and user-agent indefinitely; volume is currently trivial                                                                                                                                                                               | Scheduled purge job with a defined retention window            |
| Audit tables are write-only          | No admin UI reads them; the unrouted `list` helpers were removed as dead code guarding sensitive data                                                                                                                                                      | Query directly when investigating, or build a gated admin view |
| Sample logins have full write access | Portfolio project, documented tradeoff below                                                                                                                                                                                                               | Read-only sample accounts, or a scheduled reset job            |

## AI assistant restrictions (this repo)

- No customer personal data (names, contacts, account numbers, transactions) may be pasted into AI tooling without approved exemption.
- No credentials (passwords, API keys, tokens, connection strings) may be pasted into AI tooling.
