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

<img src="docs/screenshots/landing.png?v=3" alt="StayFlow portal picker — Member, Staff, and Management" width="100%" />

<br />

## What is this?

Running a nice apartment building today still means a lot of phone calls, paper sign-in sheets, and sticky notes. Someone wants to book the pool — they call the front desk. A resident's guest is coming — the front desk has to remember to expect them. Management wants to know how busy the gym was last month — someone has to go dig through a spreadsheet.

**StayFlow puts all of that in one place.** It's a single app that looks and works differently depending on who's using it — residents get a booking app, front-desk staff get an operations tool, and management gets a dashboard. Everyone sees exactly what they need, nothing more.

It's a real, working product — not a mockup. Every booking, guest pass, and message is saved to a real database, and the whole thing is live on the internet right now.

<br />

## Try It Live

No install, no signup — just click in and look around.

**➜ [stay-flow-alpha.vercel.app](https://stay-flow-alpha.vercel.app/)**

Pick a portal and sign in with any of these sample accounts — seeded test data, not a real person's information.

| Portal        | Who it's for    | Email                | Password        |
| ------------- | --------------- | -------------------- | --------------- |
| 🏠 Member     | Residents       | `member@stayflow.io` | `StayFlow2026!` |
| 🛎️ Staff      | Front desk      | `staff@stayflow.io`  | `StayFlow2026!` |
| 📊 Management | Building admins | `admin@stayflow.io`  | `StayFlow2026!` |

<br />

## A Look Inside

<table>
<tr>
<td width="50%">

**Resident dashboard**
<br />
<sub>Weather, upcoming reservations, community notices, and one-tap shortcuts — all on the resident's home screen.</sub>
<br /><br />
<img src="docs/screenshots/member-dashboard.png?v=3" width="100%" alt="Resident dashboard showing upcoming reservations, weather, and quick actions" />

</td>
<td width="50%">

**Booking amenities**
<br />
<sub>Browse the pool, gym, screening room, and more — see what's open, what's booked, and reserve a spot in a few taps.</sub>
<br /><br />
<img src="docs/screenshots/member-facilities.png?v=3" width="100%" alt="Facilities page with photos, ratings, and booking history" />

</td>
</tr>
<tr>
<td width="50%">

**Runs great on a phone**
<br />
<sub>Most residents will open this on their phone in the elevator, not at a desk — so it had to feel just as good there.</sub>
<br /><br />
<img src="docs/screenshots/member-mobile.png?v=3" width="45%" alt="Mobile view of the resident dashboard" />

</td>
<td width="50%">

**Management dashboard**
<br />
<sub>Total residents, today's bookings, dining revenue, facility usage, and guest traffic — the whole community's pulse on one screen.</sub>
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
- Manage your household — family members, vehicles, emergency contacts

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
- One dashboard for the whole community — occupancy, revenue, activity
- Manage the resident and staff directory
- Full reports and analytics, exportable

</td>
</tr>
</table>

<br />

## Why This Project

I built StayFlow to show what I can do end to end — not just write code, but design a product a real business could run on.

- **It's a real system, not a demo shell.** Every screen is backed by an actual PostgreSQL database — nothing here is hardcoded or faked for the screenshots.
- **Three different experiences, one codebase.** The same app looks completely different depending on whether you're a resident, staff, or an admin — with real permission rules underneath, not just hidden buttons.
- **Security was treated like it mattered.** Passwords are hashed, logins lock out after repeated failures, sessions can be revoked instantly, and every account can only see its own data — the way a real company handles real user accounts.
- **It's actually deployed.** This isn't running on my laptop — it's live, on a real domain, the way I'd ship it for a client.

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

In plain terms: a fast, modern website (React) talking to a proper backend server (Node + Express) that stores everything in a real database (PostgreSQL), all running live on free cloud hosting (Vercel for the frontend, Render for the API) — the same kind of stack used by production apps at real companies.

<br />

## For Developers

Curious about the architecture, database design, API routes, or security decisions? The engineering docs — system diagrams, data model, auth flow, business rules, and more — live in [docs/](docs/): [Architecture](docs/ARCHITECTURE.md) · [Schema](docs/SCHEMA.md) · [Rules](docs/RULES.md) · [Security](docs/SECURITY.md) · [Design](docs/DESIGN.md).

### Running it locally

```bash
# 1. Clone
git clone https://github.com/dooddles07/StayFlow.git && cd StayFlow

# 2. Install frontend deps
npm install

# 3. Configure env — single file at the repo root, found from either directory
cp .env.example .env   # set DATABASE_URL, JWT_SECRET (32+ chars), VITE_API_URL (+ PORT/CORS_ORIGIN if running the standalone backend dev server)

# 4. Backend deps + DB
cd server && npm install
cd ..
./server/node_modules/.bin/prisma migrate deploy --schema=server/prisma/schema.prisma
cd server && npm run seed && cd ..   # optional: SEED_PASSWORD=... node prisma/seed.js

# 5. Run (dev)
npm run dev                          # http://localhost:3000

# 6. Test / build
npm run test
npm run build && npm run start       # local prod-style run only — actual prod is Render (API) + Vercel (frontend)
```

Full env var reference: [docs/SECURITY.md](docs/SECURITY.md#environment-variables). Schema workflow detail: [docs/SCHEMA.md](docs/SCHEMA.md#schema-change-workflow).

### Troubleshooting

| Symptom                                                                | Likely cause                                                                                                                  | Fix                                                                                                                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Server exits: `Missing required env var`                               | `DATABASE_URL`/`JWT_SECRET` unset                                                                                             | Set them in the root `.env` or in Render's dashboard                                                                                  |
| Server exits: `Missing required env var in production: RESEND_API_KEY` | Deliberate. Without a mail key, reset links are never delivered and the only copy is the log — so production refuses to start | Set `RESEND_API_KEY` and `APP_URL` in Render's dashboard                                                                              |
| Server exits: `JWT_SECRET must be at least 32 characters`              | Weak signing secret — every session would be forgeable offline                                                                | Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`                                        |
| `Environment variable not found: DATABASE_URL` from Prisma CLI         | Prisma's CLI (unlike the API) still resolves `.env` from the CWD                                                              | Run from root: `./server/node_modules/.bin/prisma <cmd> --schema=server/prisma/schema.prisma`                                         |
| `401 Invalid or expired token` after reset                             | `tokenVersion` bumped → old session revoked                                                                                   | Sign in again                                                                                                                         |
| Stuck on "Set your password" screen after login                        | `mustChangePassword` still `true` — expected for a freshly management-issued login                                            | Complete the form (or use forgot-password) — both clear the flag                                                                      |
| `429 Too many attempts` on login                                       | rate limit / account lock                                                                                                     | Wait window (15 min lock, 15 min login window)                                                                                        |
| CORS blocked in browser                                                | origin not in `CORS_ORIGIN`                                                                                                   | Add exact origin to allowlist                                                                                                         |
| Reset link never arrives                                               | In dev the mailer logs instead of sending; in prod the server would not have started without a key                            | Check the server console (dev); confirm `RESEND_API_KEY`/`MAIL_FROM` (prod)                                                           |
| `403 Request origin is not allowed` on a write                         | The browser's `Origin` is not `APP_URL` or in `CORS_ORIGIN`                                                                   | Set `APP_URL` to the exact frontend origin                                                                                            |
| Everyone hits `429` at once after one bad actor                        | Proxy depth misconfigured, so all callers key to a shared upstream IP                                                         | Set `TRUST_PROXY_HOPS` to the real number of proxies in front of the API                                                              |
| Debugging                                                              | —                                                                                                                             | Logs are JSON lines; grep by the `X-Request-Id` returned on the failing response. Plus the `auth_events`/`admin_action_events` tables |

### Known limitations

- No payment/billing (see [docs/PRD.md](docs/PRD.md)).
- No background jobs/scheduler — reminders and expiry are not automated.
- Email delivery (Resend) only works with `RESEND_API_KEY` set — without it, reset/email-change links are logged to console instead of sent (dev and prod alike).

<br />

---

<div align="center">

Built by **Brix** · [Live Demo](https://stay-flow-alpha.vercel.app/) · [Technical Docs](docs/ARCHITECTURE.md) · [MIT License](LICENSE.md)

</div>
