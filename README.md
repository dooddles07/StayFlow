<div align="center">

<img src="public/logo.svg?v=2" width="64" alt="StayFlow logo" />

# StayFlow

**One app for everything at your building.**

Residents book the pool and reserve dinner. The front desk knows who's arriving. Management sees the whole community at a glance.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-6d5efc?style=for-the-badge)](https://stayflow-production-bc16.up.railway.app)
![Status](https://img.shields.io/badge/Status-Live-4ade80?style=for-the-badge)
![Portfolio Project](https://img.shields.io/badge/Type-Portfolio%20Project-fbbf24?style=for-the-badge)

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

**➜ [stayflow-production-bc16.up.railway.app](https://stayflow-production-bc16.up.railway.app)**

Pick a portal and sign in with any of these. They're demo accounts seeded with sample data — nothing here is a real person's information.

| Portal | Who it's for | Email | Password |
| --- | --- | --- | --- |
| 🏠 Member | Residents | `member@stayflow.io` | `StayFlow2026!` |
| 🛎️ Staff | Front desk | `staff@stayflow.io` | `StayFlow2026!` |
| 📊 Management | Building admins | `admin@stayflow.io` | `StayFlow2026!` |

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
![Railway](https://img.shields.io/badge/Railway-Deployed-0B0D0E?style=flat-square&logo=railway&logoColor=white)

</div>

In plain terms: a fast, modern website (React) talking to a proper backend server (Node + Express) that stores everything in a real database (PostgreSQL), all running live on a cloud host (Railway) — the same kind of stack used by production apps at real companies.

<br />

## For Developers

Curious about the architecture, database design, API routes, or security decisions? The engineering docs — system diagrams, data model, auth flow, business rules, and more — live in [docs/](docs/): [Architecture](docs/Architecture.md) · [Schema](docs/Schema.md) · [Rules](docs/Rules.md) · [Security](docs/Security.md) · [Design](docs/Design.md).

<br />

---

<div align="center">

Built by **QUAN7UM** · [Live Demo](https://stayflow-production-bc16.up.railway.app) · [Technical Docs](docs/Architecture.md)

</div>
