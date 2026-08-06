# StayFlow — Handover

Everything a new owner needs to run this project. Read this before touching the code.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) for how the system is built, [SECURITY.md](SECURITY.md) for the controls and the full env var table, [SCHEMA.md](SCHEMA.md) for the data model, [RULES.md](RULES.md) for business rules.

## What you are taking over

A community management platform for a residential building, live at [stay-flow-alpha.vercel.app](https://stay-flow-alpha.vercel.app/). Three portals (Member, Staff, Management) over one React frontend and one Express API, backed by PostgreSQL.

Everything runs on free plans. Total cost is $0/month, and the limits in [Cost and capacity](#cost-and-capacity) are what you are trading for that.

## Services

Six accounts. Nothing here bills you, but each has a ceiling that matters.

| Service        | What it does                    | Plan      | Where credentials live           |
| -------------- | ------------------------------- | --------- | -------------------------------- |
| **GitHub**     | Source of truth, CI             | Free      | Repo settings                    |
| **Vercel**     | Frontend build and hosting      | Hobby     | Vercel → Environment Variables   |
| **Render**     | Express API                     | Free web  | Render → Environment             |
| **Neon**       | PostgreSQL                      | Free      | Neon dashboard → Roles           |
| **Resend**     | Password reset and email-change | Free      | Resend → API Keys                |
| **Cloudinary** | Photo hosting for admin uploads | Free      | Cloudinary → Settings → API Keys |
| **Sentry**     | Error tracking, API and browser | Developer | Sentry → Project → Client Keys   |

No credential is stored in this repo. `.env` is gitignored and CI fails the build if a credential-shaped string appears in a tracked file. Every live value lives in the platform dashboard that needs it.

### Which variable goes where

Render runs the API and holds most of it: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, `CORS_ORIGIN`, `APP_URL`, `RESEND_API_KEY`, `MAIL_FROM`, `SENTRY_DSN`, and the three `CLOUDINARY_*` values.

Vercel holds exactly one: `VITE_SENTRY_DSN`. Anything prefixed `VITE_` is compiled into the browser bundle, so treat it as public. Use a separate Sentry DSN for the browser rather than reusing the API's.

The API refuses to boot in production without `RESEND_API_KEY` and `APP_URL`. That is deliberate. Without a mail key, reset links are never delivered and the only copy is the log, which turns the log stream into a store of live account-takeover tokens. Booting broken was judged worse than not booting. See [SECURITY.md](SECURITY.md#environment-variables).

## First day

1. Get invited to all seven services above.
2. **Rotate every credential.** Standard practice on any handover, and cheap: reset the Neon role password, issue a new Resend key, generate a fresh `JWT_SECRET`, roll the Cloudinary key. Rotating `JWT_SECRET` signs every user out and has no other effect.
3. Clone and run locally. The README's [Running it locally](../README.md#running-it-locally) section takes about five minutes.
4. Run `npm test`. 524 tests should pass. If they don't, fix that before anything else.
5. Read [RULES.md](RULES.md). The permission model is the part of this codebase most likely to bite you.

### Rotating credentials

Order matters. Change the value at the provider first, then paste it into the platform, then deploy once.

| Credential              | Where to rotate                     | Blast radius                                            |
| ----------------------- | ----------------------------------- | ------------------------------------------------------- |
| Neon role password      | Neon → Roles → Reset password       | Update both `DATABASE_URL` and `DIRECT_URL`             |
| `JWT_SECRET`            | Generate locally, paste into Render | Every user is signed out                                |
| `RESEND_API_KEY`        | Resend → API Keys                   | Mail stops until updated; API won't boot without it     |
| `CLOUDINARY_API_SECRET` | Cloudinary → API Keys               | Uploads 503 until updated; existing images keep working |
| Sentry DSN              | Sentry → Project → Client Keys      | Errors stop reporting                                   |

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Cost and capacity

Four separate budgets. Blowing any one of them takes the site down, and three of them reset monthly.

| Budget                | Limit                    | Current use                                                   | What happens at the limit          |
| --------------------- | ------------------------ | ------------------------------------------------------------- | ---------------------------------- |
| Render instance hours | 750/month per workspace  | ~720 if warm 24/7                                             | Service suspended until next month |
| Neon compute          | 100 CU-hours/month       | Scales to zero after 5 min idle                               | Database suspended                 |
| Neon storage          | 0.5 GB                   | Grows with `auth_events`, notifications, legacy base64 photos | Writes fail                        |
| Neon egress           | 5 GB/month               | Grows with image and list payloads                            | Throttled                          |
| Cloudinary            | 25 credits/month         | 1 credit = 1 GB storage or bandwidth                          | Warnings, then account disabled    |
| Sentry                | 5K errors/month, shared  | Errors only, no tracing spans                                 | Events dropped, never billed       |
| Resend                | 3K emails/month, 100/day | Password resets only                                          | Sends fail                         |

**The Render and Neon budgets interact, and getting it wrong is the most likely way to break this.** Keeping the API warm with an uptime pinger costs 720 of the 750 Render hours, which fits. But if that pinger hits an endpoint that touches the database, Neon never scales to zero and burns its 100 compute-hours in about half a month.

`/api/health` is deliberately database-free for exactly this reason. `/api/health/ready` runs a real query. **Point uptime monitoring at `/api/health` and nothing else.**

### Keeping storage down

Two tables grow with traffic rather than with the size of the building, so they are what eventually fills the 0.5 GB. `server/src/utils/retention.js` sweeps them hourly: `auth_events` older than 90 days, and **read** notifications older than 180. Unread notifications are never pruned because they are still owed to someone. Both windows are configurable with `AUTH_EVENT_RETENTION_DAYS` and `NOTIFICATION_RETENTION_DAYS`.

There is one piece of outstanding cleanup. Photos used to be stored as base64 data URIs directly in Postgres. New uploads go to Cloudinary and only a URL is stored, but the seeded events, facilities, and restaurants still hold the old blobs. Re-saving each one through the admin UI with a fresh upload shrinks the row to a URL and frees both storage and egress.

## How photo uploads work

Worth understanding because it is the least obvious flow in the system.

The browser never sends an image to our API. It asks `POST /api/uploads/signature` for a signature, then uploads the file straight to Cloudinary with that signature attached. Only the resulting URL comes back to us.

That keeps the Cloudinary secret server-side, keeps multi-megabyte files out of the request body, and is why every endpoint can hold a flat 100 kb body limit. The signature endpoint is MANAGEMENT-only and rate limited to 30 per 15 minutes, since each signature is one free-tier upload someone else is paying for.

The Cloudinary API key needs permission to create assets. A key scoped to the Media Library User role will return `403 missing permissions (actions=["create"])` unless it has been granted upload rights on the target folder.

## Deploying

Push to `master`. Vercel rebuilds the frontend, Render rebuilds and restarts the API, and Render runs `prisma migrate deploy` during its build.

`vercel.json` owns the frontend build command, the `/api/*` rewrite, and the static security headers (HSTS, `frame-ancestors 'none'`, etc). `Content-Security-Policy` does not live there — it is minted per request by the SSR layer (`src/lib/csp.ts`) so `script-src` can carry a fresh nonce instead of `'unsafe-inline'`. `render.yaml` owns the API build and start commands, the health check path, and the environment variable contract.

Two things to know about the database connection. `DATABASE_URL` points at Neon's **pooled** host, the one with `-pooler` in the hostname, because the running API opens a connection pool per process and the direct host allows too few connections on the free plan. `DIRECT_URL` points at the **direct** host, because Prisma Migrate needs one real session for advisory locks and DDL, which PgBouncer's transaction pooling cannot provide. Swapping these breaks deploys.

To roll back, redeploy the previous build in each dashboard. Never revert a schema change by deleting an applied migration file or hand-editing data. Write a new migration.

## When something breaks

Start with the logs. Every request carries an `X-Request-Id` that is echoed on the response and included in the body of any 500, so a user-reported failure can be traced to its log line. Logs are one JSON object per line.

| Symptom                          | First thing to check                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| Whole site down                  | Render dashboard. Suspended service means the 750-hour budget ran out               |
| API up, every request 500s       | Neon dashboard. Suspended compute means the 100 CU-hour budget ran out              |
| Deploy fails at the migrate step | `DIRECT_URL` is wrong or missing. It must be the non-pooled host                    |
| API won't boot                   | Read the exit message. `env.js` names the missing variable                          |
| Uploads fail                     | Browser console. The Cloudinary rejection reason is logged verbatim                 |
| Users report being signed out    | Someone rotated `JWT_SECRET`, or they used logout, which revokes on all devices     |
| One user is locked out           | Five failed logins triggers a 15-minute lock. `auth_events` has the attempt history |

`auth_events` and `admin_action_events` are the audit trail. They are write-only, with no admin UI, so query them directly when investigating.

## Known debt

Honest list. None of this is on fire.

- **Rate-limit counters are in memory.** Correct on one instance, wrong the moment a second one runs. Needs a Redis store before scaling out.
- **Sample accounts have full write access.** Acceptable for a portfolio project. Rotate them with `TEST_PASSWORD=… node server/scripts/reset-test-passwords.js --force` before any real use.
- **No load test.** Nothing establishes the throughput of any endpoint.
- **Legacy base64 photos** still occupy Postgres rows, as described above.

## Who to ask

Original author: Brix ([@dooddles07](https://github.com/dooddles07)). No other contributors. MIT licensed, see [LICENSE.md](../LICENSE.md).
