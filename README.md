<div align="center">

<img src="public/logo.svg?v=2" width="64" alt="StayFlow logo" />

# StayFlow

**One app for everything at your building.**

Residents book the pool and reserve dinner. The front desk knows who's arriving. Management sees the whole community at a glance.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-6d5efc?style=for-the-badge)](https://stay-flow-alpha.vercel.app/)
![Status](https://img.shields.io/badge/Status-Live-4ade80?style=for-the-badge)
![Portfolio Project](https://img.shields.io/badge/Type-Portfolio%20Project-fbbf24?style=for-the-badge)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE.md)

</div>

<br />

<img src="docs/screenshots/landing.png?v=3" alt="StayFlow portal picker for Member, Staff, and Management" width="100%" />

<br />

## What is this?

Running a nice apartment building still means a lot of phone calls, paper sign-in sheets, and sticky notes. Someone wants to book the pool, so they call the front desk. A resident's guest is coming, so the front desk has to remember to expect them. Management wants to know how busy the gym was last month, so someone digs through a spreadsheet.

**StayFlow puts all of that in one place.** One app that looks and works differently depending on who's using it. Residents get a booking app, front-desk staff get an operations tool, management gets a dashboard. Everyone sees what they need and nothing more.

Every booking, guest pass, and message is saved to a real PostgreSQL database, and the whole thing is live on the internet right now.

<br />

## Try It Live

No install, no signup. Click in and look around.

**➜ [stay-flow-alpha.vercel.app](https://stay-flow-alpha.vercel.app/)**

Pick a portal and sign in with any of these sample accounts. They are seeded test data, not a real person's information.

| Portal        | Who it's for    | Email                | Password        |
| ------------- | --------------- | -------------------- | --------------- |
| 🏠 Member     | Residents       | `member@stayflow.io` | `StayFlow2026!` |
| 🛎️ Staff      | Front desk      | `staff@stayflow.io`  | `StayFlow2026!` |
| 📊 Management | Building admins | `admin@stayflow.io`  | `StayFlow2026!` |

The first request of the day can take up to 50 seconds. The API runs on a free Render instance that spins down after 15 minutes of no traffic.

<br />

## A Look Inside

<table>
<tr>
<td width="50%">

**Resident dashboard**
<br />
<sub>Weather, upcoming reservations, community notices, and one-tap shortcuts on the resident's home screen.</sub>
<br /><br />
<img src="docs/screenshots/member-dashboard.png?v=3" width="100%" alt="Resident dashboard showing upcoming reservations, weather, and quick actions" />

</td>
<td width="50%">

**Booking amenities**
<br />
<sub>Browse the pool, gym, screening room, and more. See what's open, what's booked, and reserve a spot in a few taps.</sub>
<br /><br />
<img src="docs/screenshots/member-facilities.png?v=3" width="100%" alt="Facilities page with photos, ratings, and booking history" />

</td>
</tr>
<tr>
<td width="50%">

**Runs great on a phone**
<br />
<sub>Most residents open this on their phone in the elevator, not at a desk, so it had to feel just as good there.</sub>
<br /><br />
<img src="docs/screenshots/member-mobile.png?v=3" width="45%" alt="Mobile view of the resident dashboard" />

</td>
<td width="50%">

**Management dashboard**
<br />
<sub>Total residents, today's bookings, dining revenue, facility usage, and guest traffic on one screen.</sub>
<br /><br />
<img src="docs/screenshots/management-dashboard.png?v=3" width="100%" alt="Management analytics dashboard with charts for revenue, utilization, and engagement" />

</td>
</tr>
</table>

<br />

## What You Can Do

<table>
<tr>
<th width="33%">🏠 As a Resident</th>
<th width="33%">🛎️ As Front Desk Staff</th>
<th width="33%">📊 As Management</th>
</tr>
<tr valign="top">
<td>

- Book the pool, gym, or any amenity
- Reserve a table at the building's restaurants
- Register a guest and get them a QR entry pass
- RSVP to community events
- Read building notices and announcements
- Get notified the moment a booking is confirmed
- Manage your household: family members, vehicles, emergency contacts

</td>
<td>

- See every booking and dining reservation, and confirm or decline them
- Check guests in and out at the door
- Mark a facility as closed for maintenance
- Manage the restaurant menu and tables
- Post community notices and events

</td>
<td>

- Everything staff can do, plus:
- One dashboard for the whole community: occupancy, revenue, activity
- Manage the resident and staff directory
- Full reports and analytics, exportable

</td>
</tr>
</table>

<br />

## Why This Project

I built StayFlow to show what I can do end to end, not just write code but design a product a real business could run on.

- **It's a real system, not a demo shell.** Every screen reads from an actual PostgreSQL database. Nothing here is hardcoded or faked for the screenshots.
- **Three experiences, one codebase.** The same app looks completely different for a resident, staff member, or admin, with permission rules enforced on the server rather than by hiding buttons.
- **Security was treated like it mattered.** Passwords are hashed with bcrypt, logins lock out after repeated failures, sessions can be revoked instantly, and a 151-case test matrix proves every route rejects the roles it should.
- **It's actually deployed.** Not running on my laptop. Live, on a real domain, the way I'd ship it for a client.

<br />

## Built With

<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-API-46E3B7?style=flat-square&logo=render&logoColor=white)

</div>

In plain terms: a fast modern website (React) talking to a backend server (Node and Express) that stores everything in a database (PostgreSQL), running on free cloud hosting. Vercel serves the frontend, Render runs the API, Neon hosts the database.

<br />

---

# For Developers

**Taking this project over?** Start with **[docs/HANDOVER.md](docs/HANDOVER.md)**. It lists every account and service, where each credential lives, what breaks first, and how to fix it.

The rest of the engineering docs: [Architecture](docs/ARCHITECTURE.md) · [Schema](docs/SCHEMA.md) · [Business rules](docs/RULES.md) · [Security](docs/SECURITY.md) · [Design](docs/DESIGN.md) · [Changelog](docs/CHANGELOG.md)

## How it fits together

Three hosted pieces, all on free plans:

```
Browser
   |
   v
Vercel  (React 19 + TanStack Start, SSR)
   |  rewrites /api/* server-side, so the browser sees one origin
   v
Render  (Express API, single instance)
   |
   v
Neon    (PostgreSQL, accessed through Prisma)
```

The rewrite matters. The auth cookie is `httpOnly` and `SameSite=Lax`, so a genuine cross-site request would drop it. Routing `/api/*` through Vercel keeps everything same-origin from the browser's point of view.

Two other services are optional. Cloudinary hosts uploaded photos, and Sentry collects errors. Leave either unconfigured and the app still runs, minus that feature.

## Running it locally

```bash
# 1. Clone
git clone https://github.com/dooddles07/StayFlow.git && cd StayFlow

# 2. Frontend deps
npm install

# 3. Env: one file at the repo root, found from either directory
cp .env.example .env

# 4. Backend deps, then migrate and seed
cd server && npm install && cd ..
./server/node_modules/.bin/prisma migrate deploy --schema=server/prisma/schema.prisma
cd server && npm run seed && cd ..   # optional: SEED_PASSWORD=... npm run seed

# 5. Run
npm run dev                          # http://localhost:3000

# 6. Check your work
npm run lint
npm run lint:server
npm run typecheck
npm test
npm run build
```

Four variables are enough to boot locally:

| Variable       | Why                                                                                  |
| -------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL` | Postgres connection used by the running app                                          |
| `DIRECT_URL`   | Non-pooled connection used by the Prisma CLI. Set it equal to `DATABASE_URL` locally |
| `JWT_SECRET`   | 32 characters minimum. The API refuses to boot on anything shorter                   |
| `APP_URL`      | `http://localhost:3000`. Builds reset links and gates the `Origin` on writes         |

Everything else is optional in development. Full reference: [docs/SECURITY.md](docs/SECURITY.md#environment-variables).

## Where things live

| Path                          | What's in it                                                              |
| ----------------------------- | ------------------------------------------------------------------------- |
| `src/routes/`                 | File-based pages, one folder per portal (`member`, `staff`, `management`) |
| `src/components/stayflow/`    | App components. `ui/` holds the Radix and shadcn primitives               |
| `src/lib/api/`                | One typed client module per resource                                      |
| `server/src/routes/`          | Express routers. `index.js` mounts them and attaches the auth guards      |
| `server/src/controllers/`     | Request handling, field allowlists, audit logging                         |
| `server/src/schemas/`         | Zod validation, one file per resource                                     |
| `server/prisma/schema.prisma` | The data model. Migrations sit beside it                                  |

## Deploying

Push to `master`. Vercel rebuilds the frontend, Render rebuilds and restarts the API, and Render runs `prisma migrate deploy` as part of its build.

Two config files own the deployment contract: [`vercel.json`](vercel.json) for the frontend build, the `/api/*` rewrite, and the security headers; [`render.yaml`](render.yaml) for the API build and start commands, health check path, and the list of environment variables.

To roll back, redeploy the previous build in each dashboard. Never revert a schema change by deleting an applied migration. Write a new one.

## Testing

261 tests run under Vitest. The two worth knowing about:

`server/src/routes/authorization.matrix.test.js` drives 151 real HTTP requests through the actual router and guard chain, asserting which roles get a 403 on which route. Adding a route without adding it here is how permissions quietly regress.

`server/src/routes/hardening.regression.test.js` covers the security fixes so they can't be undone by accident.

## Troubleshooting

| Symptom                                                                | Likely cause                                                                                        | Fix                                                                                              |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Server exits: `Missing required env var`                               | `DATABASE_URL` or `JWT_SECRET` unset                                                                | Set them in the root `.env` or Render's dashboard                                                |
| Server exits: `Missing required env var in production: RESEND_API_KEY` | Deliberate. Without a mail key, reset links are never delivered and the only copy is the log        | Set `RESEND_API_KEY` and `APP_URL` in Render                                                     |
| Server exits: `JWT_SECRET must be at least 32 characters`              | Weak signing secret. Every session would be forgeable offline                                       | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`                 |
| Prisma: `You must provide a nonempty direct URL`                       | `DIRECT_URL` unset                                                                                  | Set it. Locally it can be the same value as `DATABASE_URL`                                       |
| Prisma migrate hangs or errors on deploy                               | `DIRECT_URL` points at the pooled host. Migrations need one real session for advisory locks and DDL | Use Neon's direct host (no `-pooler`) for `DIRECT_URL`                                           |
| `Environment variable not found: DATABASE_URL` from the Prisma CLI     | Running from a directory the CLI can't resolve `.env` from                                          | Run from root with the pinned binary and an explicit `--schema` path                             |
| Photo upload toast says uploads are not set up                         | 503 from `/api/uploads/signature`. Cloudinary credentials missing                                   | Set the three `CLOUDINARY_*` variables in Render                                                 |
| Cloudinary returns 403 `missing permissions (actions=["create"])`      | The API key's role can't create assets                                                              | Use a Master Admin key, or grant the target folder upload rights                                 |
| Cloudinary returns `Invalid Signature`                                 | `CLOUDINARY_API_SECRET` doesn't match the key, often trailing whitespace when pasted                | Re-copy the secret                                                                               |
| `401 Invalid or expired token` after a password reset                  | `tokenVersion` was bumped, so the old session is revoked                                            | Sign in again                                                                                    |
| Stuck on "Set your password" after login                               | `mustChangePassword` is still `true`, expected for a freshly issued login                           | Complete the form, or use forgot-password. Both clear the flag                                   |
| `429 Too many attempts` on login                                       | Rate limit or account lock                                                                          | Wait out the window. 15 minutes for both                                                         |
| Everyone hits `429` at once after one bad actor                        | Proxy depth misconfigured, so every caller keys to a shared upstream IP                             | Set `TRUST_PROXY_HOPS` to the real number of proxies in front of the API                         |
| `403 Request origin is not allowed` on a write                         | The browser's `Origin` is neither `APP_URL` nor in `CORS_ORIGIN`                                    | Set `APP_URL` to the exact frontend origin                                                       |
| CORS blocked in the browser                                            | Origin not in `CORS_ORIGIN`                                                                         | Add the exact origin to the allowlist                                                            |
| Reset link never arrives                                               | In dev the mailer logs instead of sending. In prod the server would not have started without a key  | Check the server console in dev. Confirm `RESEND_API_KEY` and `MAIL_FROM` in prod                |
| First request of the day takes ~50s                                    | Render free instance spun down after 15 minutes idle                                                | Expected. An uptime pinger on `/api/health` keeps it warm                                        |
| Anything else                                                          | —                                                                                                   | Logs are JSON lines. Grep the `X-Request-Id` from the failing response, then check `auth_events` |

## Known limitations

- No payment or billing. See [docs/PRD.md](docs/PRD.md).
- No job scheduler. The one recurring task is an in-process hourly sweep that prunes old `auth_events` and read notifications.
- Email only sends when `RESEND_API_KEY` is set. Without it, reset and email-change links are logged to console instead.
- Photo uploads need Cloudinary credentials. Without them the admin UI asks for a photo URL instead of offering a file picker.
- Error tracking needs a Sentry DSN. Without one, failures are only visible in the platform's own log stream.
- Rate-limit counters live in memory, so they are per-instance and reset on deploy. Correct on the current single-instance plan, wrong the moment a second instance runs.
- Free-tier ceiling: one Render instance at 512 MB, Neon at 0.5 GB storage and 100 compute-hours per month. Comfortable for a single property. Not a 100,000-user deployment.

<br />

---

<div align="center">

Built by **Brix** · [Live Demo](https://stay-flow-alpha.vercel.app/) · [Handover](docs/HANDOVER.md) · [Architecture](docs/ARCHITECTURE.md) · [MIT License](LICENSE.md)

</div>
