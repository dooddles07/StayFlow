# StayFlow

> Luxury residential-community living platform — one app for residents, on-site staff, and building management.

| | |
| --- | --- |
| **Project Name** | StayFlow |
| **Version** | `1.0.0` |
| **Current Status** | Active · Deployed to production on Railway |
| **Author** | QUAN7UM |
| **Repository** | https://github.com/dooddles07/StayFlow |
| **Last Updated** | 2026-07-15 |
| **Supported Platforms** | Web (responsive desktop + mobile browsers) |
| **Technology Stack** | React 19 · TanStack Start/Router · Vite 8 · TypeScript · Tailwind v4 · Node.js · Express 4 · Prisma 6 · PostgreSQL · JWT |
| **Live URL** | https://stayflow-production-bc16.up.railway.app |

**Short description.** StayFlow is a full-stack, role-based community-management app. Residents book amenities, reserve restaurant tables, register guests, RSVP to events, and read notices. Staff operate the front desk (check guests in/out, manage bookings). Management administers users, facilities, dining, events, notices, and analytics. Frontend and API ship as **one Node service** in production: `/api/*` routes to Express, everything else to the TanStack Start SSR app.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [High Level Architecture](#high-level-architecture)
- [Complete System Architecture](#complete-system-architecture)
- [End-to-End System Flow](#end-to-end-system-flow)
- [Folder Structure](#folder-structure)
- [Technology Stack](#technology-stack)
- [System Modules](#system-modules)
- [Database Documentation](#database-documentation)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [User Roles](#user-roles)
- [Environment Variables](#environment-variables)
- [Credentials](#credentials)
- [Third Party Services](#third-party-services)
- [Deployment](#deployment)
- [Installation Guide](#installation-guide)
- [Configuration Guide](#configuration-guide)
- [Automation](#automation)
- [Logging](#logging)
- [Security](#security)
- [Performance](#performance)
- [Testing](#testing)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)
- [Maintenance Guide](#maintenance-guide)
- [Future Improvements](#future-improvements)
- [Diagrams](#diagrams) (Dependency · Data Flow · Sequence · Infrastructure · Network · State · Activity · Package · Component · Class)
- [Credits](#credits)

---

## Executive Summary

- **What it is.** A single-tenant web platform for a premium residential community. Three portals (Member, Staff, Management) sit on one React app, gated by the signed-in user's role.
- **Who uses it.** Residents (members), on-site staff (front desk / facilities), and building management (admins).
- **Business purpose.** Digitize concierge-style community operations: amenity bookings, private dining, guest passes, community events, notices, and operational analytics — replacing phone/paper workflows.
- **Overall architecture.** SSR React frontend (TanStack Start) + REST API (Express + Prisma) over PostgreSQL. In production both are served by one Node process (`scripts/start.mjs`) behind Railway. Auth is hand-rolled JWT delivered in an **httpOnly cookie**.
- **Major features.** Role-based portals · JWT auth with account lockout + audit trail · password-reset flow · facility booking · restaurant/table dining reservations · guest passes with QR + check-in/out · events + RSVP · notices · notifications · management analytics.
- **Key modules.** Auth, Residents, Staff, Facilities, Bookings, Restaurants, Tables, Dining Reservations, Guests, Events, Notices, Notifications.

---

## High Level Architecture

```mermaid
graph TD
  User["User (Member / Staff / Management)"]
  Browser["Browser — React 19 SPA/SSR"]
  Node["Node service — scripts/start.mjs"]
  SSR["TanStack Start SSR handler<br/>(dist/server)"]
  Static["Static assets<br/>(dist/client)"]
  API["Express API app<br/>(server/src/app.js)"]
  Prisma["Prisma ORM 6"]
  DB[("PostgreSQL")]
  Mail["Password-reset mailer<br/>(stub — no provider wired)"]

  User --> Browser --> Node
  Node -->|"/api/*"| API
  Node -->|"GET static file"| Static
  Node -->|"everything else"| SSR
  API --> Prisma --> DB
  API -.-> Mail
```

**Components**

| Component | Role |
| --- | --- |
| Browser (React) | Renders portals, holds non-sensitive user profile in `zustand`+`persist`; JWT never touches JS |
| Node service | `createServer` router: `/api` → Express, static file hit → serve `dist/client`, else → SSR `handler.fetch` |
| Express API | REST endpoints, auth, RBAC, rate limiting, security headers |
| Prisma | Typed DB access + migrations |
| PostgreSQL | System of record (Railway-managed in prod) |
| Mailer | Reset-link delivery — **stubbed**; logs link in dev, no-op warn in prod |

---

## Complete System Architecture

```mermaid
graph LR
  subgraph Client["Frontend (src/)"]
    Routes["TanStack file routes<br/>login · member · staff · management"]
    Stores["zustand stores<br/>auth · ui · mock"]
    ApiClient["api client<br/>fetch, credentials:include"]
    UI["UI kit — Radix + Tailwind + Recharts"]
  end

  subgraph Server["Backend (server/src/)"]
    App["app.js — helmet, cors, json, morgan"]
    RouterIdx["routes/index.js"]
    AuthR["auth.routes"]
    DataR["11 data routers"]
    MW["middleware<br/>auth · rateLimit · error"]
    Ctrls["controllers"]
    Models["Prisma models"]
    Utils["utils<br/>crudRouter · crudController · authLog · mailer · ApiError"]
  end

  DB[("PostgreSQL")]

  Routes --> ApiClient -->|HTTP /api| App --> RouterIdx
  RouterIdx --> AuthR --> MW
  RouterIdx --> DataR --> MW --> Ctrls --> Models --> DB
  Ctrls --> Utils
  Routes --> Stores
  Routes --> UI
```

- **Integrations / external APIs:** none live. Email provider is a documented stub. No payment, SMS, maps, analytics SaaS, or third-party auth.
- **Service communication:** single process; frontend↔backend over same-origin HTTP `/api`; backend↔DB over Prisma (Postgres wire protocol).

---

## End-to-End System Flow

### User Journey + Login / Authentication Flow

```mermaid
sequenceDiagram
  participant U as User
  participant FE as React (login-form)
  participant API as Express /api/auth
  participant DB as Postgres

  U->>FE: Open /login/{member|staff|management}
  U->>FE: Submit email + password
  FE->>API: POST /auth/login (credentials:include)
  API->>DB: findByEmail
  alt locked
    API-->>FE: 429 Account temporarily locked
  else bad password
    API->>DB: increment failedLoginCount (lock at 5)
    API-->>FE: 401 Invalid credentials
  else disabled
    API-->>FE: 403 Account disabled
  else success
    API->>DB: reset counters, log LOGIN_SUCCESS
    API-->>FE: 200 {user} + Set-Cookie stayflow_token (httpOnly)
    FE->>FE: store user; verify role matches portal
    FE-->>U: Redirect to portal dashboard
  end
```

### Booking Flow

```mermaid
sequenceDiagram
  participant M as Member
  participant API as /api/bookings
  M->>API: POST / (residentId forced to own from JWT)
  API-->>M: 201 Booking (status PENDING)
  Note over API: STAFF/MANAGEMENT PUT /:id to CONFIRM/CANCEL
  M->>API: DELETE /:id (own record only)
```

### Guest Pass Flow

```mermaid
stateDiagram-v2
  [*] --> PENDING: Member registers guest (passNumber issued, QR)
  PENDING --> APPROVED: Staff approves
  APPROVED --> CHECKED_IN: Staff POST /:id/check-in
  CHECKED_IN --> CHECKED_OUT: Staff POST /:id/check-out
  CHECKED_OUT --> [*]
```

### Payment Flow

> ⚠️ Unable to determine from the current repository. No payment gateway, checkout, or billing code exists.

### Notification Flow

```mermaid
graph LR
  Staff["STAFF/MANAGEMENT"] -->|POST /notifications| N[(notifications)]
  User -->|GET /notifications| N
  User -->|POST /:id/read| N
```

### Background Jobs / Queues / Scheduled Tasks

> ⚠️ Unable to determine from the current repository. No queue, worker, cron, or scheduler is present. All work is synchronous request/response. The one async side-effect is fire-and-forget audit logging (`logAuthEvent`).

### Error Handling Flow

```mermaid
graph LR
  Ctrl["controller (asyncHandler)"] -->|throw ApiError| EMW["error.middleware"]
  Ctrl -->|unknown throw| EMW
  Unknown["no route match"] --> NF["notFoundMiddleware → 404"]
  EMW -->|"JSON {error}"| Client
```

### Admin / Staff / Management Flow

- **Member:** book facilities, reserve dining, register guests, RSVP events, read notices — scoped to **own** `residentId`.
- **Staff:** list all bookings/dining/guests, confirm bookings, check guests in/out, manage facilities/restaurants/tables/events/notices.
- **Management:** everything Staff can, plus manage staff directory and residents, and view analytics/reports.

---

## Folder Structure

<details>
<summary><strong>Expand tree</strong></summary>

```
StayFlow/
├── scripts/start.mjs          # Prod entry: merges API + SSR + static into one Node server
├── vite.config.ts             # Vite 8 + TanStack Start + Tailwind + React plugins
├── package.json               # Frontend deps + scripts (dev/build/start/test/lint)
├── components.json            # shadcn/ui config
├── .env / .env.example        # Frontend + merged-server env (see Environment Variables)
├── public/                    # Static public assets
├── dist/                      # Build output (client + server) — generated
├── src/
│   ├── router.tsx             # TanStack Router setup
│   ├── routeTree.gen.ts       # Generated route tree (tsr)
│   ├── styles.css             # Tailwind entry + design tokens
│   ├── routes/                # File-based routes
│   │   ├── __root.tsx         # Root layout/shell
│   │   ├── index.tsx          # Landing
│   │   ├── login/{member,staff,management}.tsx
│   │   ├── forgot-password.tsx / reset-password.tsx
│   │   ├── member/  (index, facilities, dining, guests, events, notices, profile)
│   │   ├── staff/   (index, bookings, dining, facilities, guests, events)
│   │   └── management/ (index, users, facilities, restaurants, events, notices, analytics, reports)
│   ├── components/
│   │   ├── stayflow/          # App components (app-shell, sidebar, kpi-card, charts/, qr-code…)
│   │   └── ui/                # shadcn/Radix primitives (button, dialog, table, calendar…)
│   └── lib/
│       ├── api/client.ts      # fetch wrapper (credentials:include)
│       ├── store/             # zustand: auth-store, ui-store, mock-store
│       ├── hooks/             # use-require-auth, use-portal-preference
│       ├── mock/              # Seed-style mock datasets + types
│       └── {avatar,booking-slots,export-csv,session,utils}.ts
└── server/
    ├── server.js              # Standalone API entry (dev): prisma.$connect + app.listen
    ├── package.json           # Backend deps + prisma scripts
    ├── prisma/
    │   ├── schema.prisma       # Data model (16 models, 7 enums)
    │   ├── migrations/0_init/  # SQL migration
    │   └── seed.js             # Seed residents/staff/facilities/users
    ├── scripts/reset-test-passwords.js
    └── src/
        ├── app.js             # Express app (helmet, cors, json, morgan, routes)
        ├── config/{env.js,db.js}
        ├── routes/            # index + auth + 11 resource routers
        ├── controllers/       # Per-resource controllers
        ├── models/            # Prisma-backed models
        ├── middleware/        # auth, rateLimit, error
        └── utils/             # crudRouter, crudController, authLog, mailer, ApiError, asyncHandler
```
</details>

---

## Technology Stack

| Purpose | Technology | Version | Description |
| --- | --- | --- | --- |
| UI framework | React | ^19.2 | Component UI, SSR-capable |
| Meta-framework | TanStack Start / Router | latest | File routing, SSR, server functions |
| Build tool | Vite | ^8.0 | Dev server + bundler |
| Language | TypeScript | ^6.0 | Frontend types |
| Styling | Tailwind CSS | ^4.1 | Utility-first + `@tailwindcss/vite` |
| UI primitives | Radix UI / shadcn pattern | ^1.6 | Accessible components |
| Icons | lucide-react | ^0.577 | Icon set |
| Charts | Recharts | ^3.9 | Analytics visuals |
| Client state | zustand (+persist) | ^5.0 | Auth/UI stores |
| Dates | date-fns | ^4.4 | Date math, booking slots |
| QR | qrcode | ^1.5 | Guest-pass QR codes |
| Toasts | sonner | ^2.0 | Notifications UI |
| Runtime | Node.js | — | Prod server + dev |
| Package/runtime | Bun | — | Install + server build step (`bun`, `bunx`) |
| API framework | Express | ^4.21 | REST API |
| ORM | Prisma | ^6.3 | DB access + migrations |
| Database | PostgreSQL | — | System of record |
| Auth | jsonwebtoken | ^9.0 | JWT sign/verify |
| Hashing | bcryptjs | ^2.4 | Password hashing (cost 12) |
| Rate limiting | express-rate-limit | ^8.5 | Login/register/reset limiters |
| Security headers | helmet | ^8.3 | HSTS, nosniff, frameguard |
| CORS | cors | ^2.8 | Allowlist-based |
| Logging | morgan | ^1.10 | HTTP request logs |
| Tests | Vitest + Testing Library | ^4.1 | Unit/component tests |
| Lint/format | ESLint + Prettier | ^9 / ^3.8 | `@tanstack/eslint-config` |

---

## System Modules

Each resource follows **route → middleware → controller → model → Prisma**. Generic CRUD is factored into `utils/crudRouter.js` + `utils/crudController.js`; resources with ownership rules add explicit routers.

| Module | Purpose | Read roles | Write roles | Notable endpoints |
| --- | --- | --- | --- | --- |
| **Auth** | Login, register, logout, password reset, session | public / self | — | `/auth/*` |
| **Residents** | Resident directory + profile | STAFF, MGMT | STAFF, MGMT | CRUD |
| **Staff** | Staff directory | STAFF, MGMT | MGMT | CRUD |
| **Facilities** | Amenities catalog | any auth | STAFF, MGMT | CRUD |
| **Bookings** | Facility reservations | STAFF list; owner get | member create; STAFF update | `/resident/:id`, ownership-gated |
| **Restaurants** | Dining venues | any auth | STAFF, MGMT | CRUD |
| **Tables** | Restaurant tables | any auth | STAFF, MGMT | `/restaurant/:id` |
| **Dining Reservations** | Table bookings | STAFF list; owner get | member create; STAFF update | `/resident/:id`, ownership-gated |
| **Guests** | Guest passes + check-in/out | STAFF list; owner get | member create/edit own | `/:id/check-in`, `/:id/check-out` |
| **Events** | Community events + RSVP | any auth | STAFF, MGMT | `/:id/rsvp`, `/:id/rsvp/cancel` |
| **Notices** | Announcements | any auth | STAFF, MGMT | CRUD |
| **Notifications** | In-app notifications | any auth | STAFF, MGMT create/delete | `/:id/read` |

*Inputs:* JSON bodies + JWT (cookie/Bearer). *Outputs:* JSON. *Connected services:* PostgreSQL via Prisma only.

---

## Database Documentation

**Datasource:** PostgreSQL. **PKs:** `cuid()` text ids on all models. **Migration:** `server/prisma/migrations/0_init`.

### Tables (16) + enums (7)

`residents`, `family_members`, `vehicles`, `staff_members`, `facilities`, `bookings`, `restaurants`, `dining_tables`, `dining_reservations`, `guests`, `events`, `event_rsvps`, `notices`, `notifications`, `users`, `auth_events`.
Enums: `MembershipTier`, `BookingStatus`, `FacilityStatus`, `TableStatus`, `DiningReservationStatus`, `GuestStatus`, `PortalRole`.

**Keys / constraints / indexes**
- Unique: `residents.email`, `staff_members.email`, `guests.passNumber`, `users.email`, `users.residentId`, `users.staffId`, `users.resetTokenHash`, `event_rsvps (eventId,residentId)`.
- FKs: family/vehicles/bookings/diningReservations/guests/eventRsvps → resident; bookings→facility; tables/reservations→restaurant; users→resident?/staff?.
- Cascade delete: `family_members`, `vehicles`, `event_rsvps`.
- Indexes: `auth_events` on `userId`, `type`, `createdAt`.
- `auth_events` intentionally has **no FK** to `users` — audit history outlives deleted accounts.

### ER Diagram

```mermaid
erDiagram
  Resident ||--o{ FamilyMember : has
  Resident ||--o{ Vehicle : has
  Resident ||--o{ Booking : makes
  Resident ||--o{ DiningReservation : makes
  Resident ||--o{ Guest : hosts
  Resident ||--o{ EventRsvp : rsvps
  Resident |o--|| User : "account (optional)"
  StaffMember |o--|| User : "account (optional)"
  Facility ||--o{ Booking : receives
  Restaurant ||--o{ DiningTable : has
  Restaurant ||--o{ DiningReservation : receives
  CommunityEvent ||--o{ EventRsvp : gets
  User {
    string id PK
    string email UK
    string passwordHash
    enum role
    int tokenVersion
    bool isActive
    int failedLoginCount
    datetime lockedUntil
    string resetTokenHash UK
  }
  AuthEvent {
    string id PK
    string type
    string userId
    bool success
    datetime createdAt
  }
```

---

## API Documentation

Base path: `/api`. Auth via `stayflow_token` httpOnly cookie **or** `Authorization: Bearer <jwt>`. All non-auth routers sit behind `requireAuth`. Errors return `{ "error": "message" }` with the status below.

### Auth — `/api/auth`

| Method | URL | Purpose | Auth | Request | Success | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/register` | Create MEMBER account | public (rate-limited) | `{email,password,displayName,residentId?}` | 201 `{token,user}` + cookie | 400, 409 |
| POST | `/login` | Sign in | public (rate-limited) | `{email,password}` | 200 `{token,user}` + cookie | 401, 403, 429 |
| POST | `/logout` | Clear cookie | any | — | 204 | — |
| POST | `/forgot-password` | Request reset link | public (rate-limited) | `{email}` | 200 generic message | 400 |
| POST | `/reset-password` | Set new password | public (rate-limited) | `{token,password}` | 200 message | 400 |
| GET | `/me` | Current user | requireAuth | — | 200 `user` | 401, 404 |

### Resource routers (all under `requireAuth`)

Generic CRUD (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`) applies to **residents, staff, facilities, restaurants, tables, events, notices** with the role gates in [System Modules](#system-modules). Extra endpoints:

| Method | URL | Purpose | Role |
| --- | --- | --- | --- |
| GET | `/bookings` | List all | STAFF/MGMT |
| GET | `/bookings/resident/:residentId` | Resident's bookings | owner or STAFF/MGMT |
| POST | `/bookings` | Create (residentId forced from JWT) | any member |
| PUT | `/bookings/:id` | Update / confirm | STAFF/MGMT |
| DELETE | `/bookings/:id` | Cancel own | owner |
| GET/POST/PUT/DELETE | `/dining-reservations/*` | Same shape as bookings | same |
| GET | `/guests/resident/:residentId` | Host's guests | owner or STAFF/MGMT |
| POST | `/guests/:id/check-in` · `/check-out` | Front-desk actions | STAFF/MGMT |
| GET | `/tables/restaurant/:restaurantId` | Tables by venue | any auth |
| POST | `/events/:id/rsvp` · `/rsvp/cancel` | RSVP toggle | member (own) |
| GET | `/notifications` | List | any auth |
| POST | `/notifications/:id/read` | Mark read | any auth |
| GET | `/health` | Liveness → `{status:'ok',time}` | public |

---

## Authentication & Authorization

- **Scheme:** hand-rolled JWT (no Passport/NextAuth). Payload: `{sub,email,role,residentId,tokenVersion}`, default expiry `7d`.
- **Transport:** `Set-Cookie stayflow_token` — `httpOnly`, `sameSite=lax`, `secure` in prod, `maxAge 7d`. JWT is **never** stored in JS; frontend persists only the non-sensitive user profile for portal-gating UX. `Authorization: Bearer` also accepted.
- **Verification (`requireAuth`):** verify signature → load auth state → reject if user missing, `!isActive`, or `tokenVersion` mismatch (password reset bumps `tokenVersion`, instantly revoking old sessions).
- **Guards:** `requireRole(...roles)`, `requireOwnResidentParam`, `requireOwnResidentBody` (forces own `residentId`), `requireOwnerRecord(model, ownerField)` (loads record, checks ownership for MEMBER only).
- **Account protection:** lock 15 min after 5 consecutive failed logins (per-account, defeats IP rotation); disabled-account state only revealed to someone with the correct password.
- **OAuth / SSO / sessions table:** none — stateless JWT only.
- **No staff/management self-registration** — those accounts are created manually (seed / Prisma Studio) by design.

---

## User Roles

| Role | Portal | Can do |
| --- | --- | --- |
| **Guest (unauthenticated)** | login pages, landing | Log in, register (member), request/reset password |
| **MEMBER** (resident) | `/member/*` | Manage own bookings, dining, guests, event RSVPs; read facilities/events/notices/notifications |
| **STAFF** | `/staff/*` | All bookings/dining/guests (list, confirm, check-in/out), manage facilities/restaurants/tables/events/notices |
| **MANAGEMENT** | `/management/*` | Everything Staff + manage staff directory & residents + analytics/reports |

### Access Matrix (write)

| Resource | MEMBER | STAFF | MANAGEMENT |
| --- | --- | --- | --- |
| Own bookings/dining/guests | ✅ | ✅ | ✅ |
| All bookings/dining/guests | ❌ | ✅ | ✅ |
| Facilities / Restaurants / Tables / Events / Notices | ❌ | ✅ | ✅ |
| Residents directory | ❌ | ✅ | ✅ |
| Staff directory | ❌ | ❌ | ✅ |

---

## Environment Variables

Backend requires `DATABASE_URL` + `JWT_SECRET` (process exits at boot if missing). Frontend reads `VITE_*` at build.

| Variable | Scope | Purpose | Required | Example / placeholder |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | server | Postgres connection (Prisma) | ✅ | `postgresql://user:password@host:5432/db` |
| `DATABASE_PUBLIC_URL` | server | Public proxy DSN (local→Railway) | optional | `postgresql://user:password@public-host:5432/db` |
| `JWT_SECRET` | server | JWT signing secret | ✅ | `<random-32+-byte-secret>` |
| `JWT_EXPIRES_IN` | server | Token lifetime | optional (`7d`) | `7d` |
| `PORT` | server | API port | optional (`4000`/`3000`) | `4000` |
| `CORS_ORIGIN` | server | Comma-list allowlist; empty = same-origin only | optional | `http://localhost:3000,https://app.example` |
| `APP_URL` | server | Base URL for reset links | optional | `http://localhost:3000` |
| `NODE_ENV` | server | `production` toggles secure cookie / prod mailer | optional | `production` |
| `VITE_API_URL` | frontend | API base (defaults `/api`) | optional | `https://…/api` |
| `SEED_PASSWORD` | script | Seed users' password | optional (random) | `********` |
| `TEST_PASSWORD` | script | Reset demo passwords | required for script | `********` |

---

## Credentials

### Demo logins (development / preview only)

| Portal | Login page | Email | Password |
| --- | --- | --- | --- |
| Member | `/login/member` | `member@stayflow.io` | `********` |
| Staff | `/login/staff` | `staff@stayflow.io` | `********` |
| Management | `/login/management` | `admin@stayflow.io` | `********` |

> ⚠️ Demo/test logins only. **Rotate before any production use** via the password-reset flow or `server/scripts/reset-test-passwords.js` (set `TEST_PASSWORD`). Never commit real passwords.

### Secret placeholders

| Service | Placeholder |
| --- | --- |
| Database | `postgresql://user:password@host:5432/db` |
| JWT secret | `<random-32+-byte-secret>` |
| SMTP / Email provider | `<not configured — mailer is stubbed>` |
| Redis / AWS / Firebase / Twilio / Stripe / Google / GitHub / OpenAI | `<not used>` |

**Never expose real secrets.** All live values belong in Railway service env vars, never in tracked files.

---

## Third Party Services

| Category | Status |
| --- | --- |
| Hosting | **Railway** (single service, prod) |
| Database | PostgreSQL (Railway-managed) |
| Payment / SMS / Maps / Analytics SaaS / AI / Cloud storage / OAuth / Webhooks | **None wired.** |
| Email | Provider **stubbed** — `utils/mailer.js` logs the reset link in dev, warns + no-ops in prod. Wire Resend/SES/SMTP to enable. |

---

## Deployment

**Model:** one Railway service runs `node scripts/start.mjs`, serving API + static + SSR from one port.

```mermaid
graph TD
  Dev["git push → GitHub"] --> Railway["Railway build & deploy"]
  Railway -->|build| B["vite build && (cd server && bun install && bunx prisma generate)"]
  Railway -->|start| S["node scripts/start.mjs"]
  S --> API["/api → Express"]
  S --> Web["/* → SSR + static"]
  API --> PG[("Railway PostgreSQL")]
```

- **Local dev (frontend + API together):** `bun install && bun --bun run dev` (Vite on :3000). Backend env in root `.env` powers the merged path.
- **Local dev (API standalone):** `cd server && npm install && npm run dev` (`node --watch`, :4000).
- **Build:** `bun --bun run build` → `vite build` then server install + `prisma generate`.
- **Migrate prod DB:** `cd server && npm run prisma:deploy`.
- **Docker / Compose / Kubernetes / GitHub Actions CI:** > ⚠️ Unable to determine from the current repository — none present. Deploy is Railway-native.

---

## Installation Guide

```bash
# 1. Clone
git clone https://github.com/dooddles07/StayFlow.git && cd StayFlow

# 2. Install frontend deps
bun install

# 3. Configure env
cp .env.example .env                 # set VITE_API_URL (+ backend vars if running merged server)
cp server/.env.example server/.env   # set DATABASE_URL, JWT_SECRET, CORS_ORIGIN

# 4. Backend deps + DB
cd server && npm install
npm run prisma:generate
npm run prisma:deploy                # apply migrations
npm run seed                         # optional: SEED_PASSWORD=... node prisma/seed.js
cd ..

# 5. Run (dev)
bun --bun run dev                    # http://localhost:3000

# 6. Test / build
bun --bun run test
bun --bun run build && bun --bun run start   # prod-style merged server
```

---

## Configuration Guide

| File | Purpose |
| --- | --- |
| `vite.config.ts` | Vite plugins: devtools, tailwind, TanStack Start, React |
| `tsconfig.json` / `tsr.config.json` | TS config + TanStack Router codegen |
| `eslint.config.js` / `prettier.config.js` | Lint + format (`@tanstack/eslint-config`) |
| `components.json` | shadcn/ui generator config |
| `server/prisma/schema.prisma` | Data model, enums, datasource |
| `server/src/config/env.js` | Env validation + defaults (required: `DATABASE_URL`, `JWT_SECRET`) |
| `server/src/config/db.js` | Prisma client singleton |
| `scripts/start.mjs` | Prod server: MIME map, static caching, API/SSR routing |

---

## Automation

| Concern | Status |
| --- | --- |
| Cron jobs / Scheduled tasks | > ⚠️ None in repo |
| Queues / Background workers | > ⚠️ None |
| Webhooks | > ⚠️ None |
| Retries / timeouts | Rate limiters (login 10/15min, register 10/hr, reset 5/hr); account lock 15 min after 5 fails |
| Async side-effects | Audit logging (`logAuthEvent`) is fire-and-forget; failures logged to console, never block auth |

---

## Logging

- **HTTP:** `morgan('dev')` — method, path, status, latency to stdout.
- **Audit trail:** `auth_events` table records LOGIN_SUCCESS/FAILED/LOCKED/DISABLED, LOGOUT, REGISTER, PASSWORD_RESET_REQUEST/SUCCESS with ip + user-agent; immutable, no FK to users.
- **Errors:** `error.middleware` returns JSON; unexpected server errors logged to console in `start.mjs` + `server.js`.
- **Monitoring / tracing / APM:** > ⚠️ None configured.

---

## Security

| Control | Implementation |
| --- | --- |
| Authentication | JWT in httpOnly cookie, `tokenVersion` revocation |
| Authorization | `requireRole` + ownership guards; broken-access-control gap closed 2026-07-15 |
| Password hashing | bcrypt cost 12 (register/reset); seed uses 10 |
| Password policy | 8–72 bytes enforced (bcrypt truncation guarded) |
| Brute-force | per-IP rate limits + per-account 5-fail / 15-min lock |
| Enumeration | generic forgot-password + login responses |
| Secrets | env-only, required at boot, never in tracked files |
| Security headers | helmet (HSTS, nosniff, frameguard); CORP disabled to let CORS govern |
| CORS | explicit allowlist; wildcard+credentials refused (fails closed to same-origin) |
| SQL injection | Prisma parameterized queries only |
| XSS | httpOnly cookie keeps JWT out of JS; React escaping |
| CSRF | `sameSite=lax` cookie |
| Reset tokens | 32-byte random, SHA-256 hashed at rest, single-use, 1-hour TTL |

> **CSRF note:** `sameSite=lax` mitigates cross-site cookie use, but no anti-CSRF token exists. Add CSRF tokens if introducing cookie-based state-changing HTML forms.

---

## Performance

- **Static caching:** hashed `assets/*` served `immutable, max-age=1y`; other static `max-age=1h` (`start.mjs`).
- **SSR:** TanStack Start server rendering for fast first paint.
- **DB indexes:** unique constraints + `auth_events` indexes on `userId/type/createdAt`.
- **Client state:** zustand avoids over-fetching; profile persisted locally.
- **Caching layer / Redis / CDN:** > ⚠️ None beyond HTTP cache headers.

---

## Testing

- **Runner:** Vitest + `@testing-library/react` + `jsdom`.
- **Command:** `bun --bun run test` → `vitest run`.
- **Scope present:** unit/component harness configured.
- **Integration / E2E / coverage config:** > ⚠️ No committed integration/E2E suites or coverage thresholds found.

---

## Backup & Recovery

- **Database:** managed by Railway PostgreSQL — use Railway backups/snapshots + `pg_dump` for logical backups.
- **File storage:** no user-uploaded files (images are static/remote references) — nothing app-side to back up.
- **Recovery:** restore Postgres snapshot → re-run `prisma migrate deploy` → redeploy service.
- **Disaster recovery:** > ⚠️ No documented DR/runbook in repo; relies on Railway platform durability.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Server exits: `Missing required env var` | `DATABASE_URL`/`JWT_SECRET` unset | Set them in `server/.env` or Railway |
| `401 Invalid or expired token` after reset | `tokenVersion` bumped → old session revoked | Sign in again |
| `429 Too many attempts` on login | rate limit / account lock | Wait window (15 min lock, 15 min login window) |
| CORS blocked in browser | origin not in `CORS_ORIGIN` | Add exact origin to allowlist |
| Reset link never arrives | mailer is stubbed | Check server console (dev); wire real provider (prod) |
| Local DB won't connect via internal host | `postgres.railway.internal` is private | Use `DATABASE_PUBLIC_URL` (proxy) locally |
| Debugging | — | Watch morgan logs + `auth_events` table |

---

## Maintenance Guide

- **Update deps:** bump `package.json` / `server/package.json`, reinstall, run tests + lint.
- **Schema change:** edit `schema.prisma` → `npm run prisma:migrate` (dev) → `prisma:deploy` (prod).
- **Deploy:** push to GitHub → Railway auto-builds/starts.
- **Rollback:** redeploy previous Railway deployment; revert schema only with a compensating migration (never hand-edit applied SQL).
- **Rotate demo creds:** `TEST_PASSWORD=… node server/scripts/reset-test-passwords.js`.
- **Create STAFF/MGMT users:** manually via seed / Prisma Studio (no API endpoint by design).

---

## Future Improvements

- Wire real email provider (Resend/SES/SMTP) in `mailer.js`.
- Add payment/billing if monetizing bookings/dining.
- Self-service password change + profile edit endpoints.
- Anti-CSRF tokens for cookie-based mutations.
- CI (GitHub Actions): lint + test + typecheck gate.
- Integration/E2E suite + coverage thresholds.
- Background jobs (reminders, guest-pass expiry) via a queue/scheduler.
- Observability: structured logs + tracing + error tracking.

---

## Diagrams

### Dependency Graph

```mermaid
graph TD
  FE["Frontend"] --> React & TanStack & Vite & Tailwind & zustand & Recharts & lucide
  BE["Backend"] --> Express & Prisma & jsonwebtoken & bcryptjs & helmet & cors & rateLimit["express-rate-limit"] & morgan
  Prisma --> PostgreSQL
```

### Data Flow Diagram

```mermaid
graph LR
  U["User action"] --> C["React component"] --> A["api client"] --> E["Express route"] --> MW["guards"] --> Ctrl["controller"] --> M["model"] --> P["Prisma"] --> DB[("Postgres")]
  DB --> P --> M --> Ctrl --> E --> A --> C --> U
```

### Sequence Diagram (Password Reset)

```mermaid
sequenceDiagram
  participant U as User
  participant API as /auth
  participant DB as Postgres
  participant Mail as mailer(stub)
  U->>API: POST /forgot-password {email}
  API->>DB: findByEmail; store SHA256(token), 1h TTL
  API->>Mail: deliverResetToken(link)
  API-->>U: 200 generic message
  U->>API: POST /reset-password {token,password}
  API->>DB: match hash, not expired → hash pw, bump tokenVersion
  API-->>U: 200 sign in again
```

### Infrastructure Diagram

```mermaid
graph TD
  Client["Browser"] -->|HTTPS| Railway["Railway service — Node"]
  Railway --> Proc["scripts/start.mjs (API+SSR+static)"]
  Proc --> PG[("Railway PostgreSQL")]
```

### Network Flow Diagram

```mermaid
graph LR
  Browser -->|"HTTPS 443"| Node
  Node -->|"/api"| Express
  Node -->|"static / SSR"| Web
  Express -->|"5432 (Prisma)"| Postgres
```

### State Diagram (Booking)

```mermaid
stateDiagram-v2
  [*] --> PENDING: member creates
  PENDING --> CONFIRMED: staff confirms
  PENDING --> CANCELLED: member/staff cancels
  CONFIRMED --> CANCELLED: cancel
  CANCELLED --> [*]
```

### Activity Diagram (Guest check-in)

```mermaid
graph TD
  A["Member registers guest"] --> B{"Staff reviews"}
  B -->|approve| C["APPROVED + pass/QR"]
  C --> D["Guest arrives"] --> E["Staff check-in → CHECKED_IN"]
  E --> F["Staff check-out → CHECKED_OUT"]
```

### Package Diagram

```mermaid
graph TD
  subgraph frontend
    routes --> components --> lib
  end
  subgraph backend
    routesB["routes"] --> middleware --> controllers --> models --> config
    utils
  end
  lib -->|HTTP| routesB
```

### Component Diagram

```mermaid
graph LR
  AppShell --> Sidebar & TopBar & MobileNav
  Pages --> KpiCard & Charts & FacilityCard & ReservationRow & QRCode & GlobalSearch & NotificationBell
  Charts --> Recharts
  Pages --> UIkit["ui/ (Radix + Tailwind)"]
```

### Class Diagram (Models)

```mermaid
classDiagram
  class UserModel {
    findByEmail()
    findById()
    findAuthState()
    create()
    setLoginState()
    setResetToken()
    applyPasswordReset()
  }
  class BookingModel {
    findAll()
    findById()
    findByResident()
    create()
    update()
    remove()
  }
  class crudController {
    list()
    getOne()
    create()
    update()
    remove()
  }
  crudController <.. BookingModel
```

---

## Credits

- **Author:** QUAN7UM
- **Contributors:** > ⚠️ Unable to determine from the current repository.
- **Company:** > ⚠️ Not specified in the repository.
- **License:** > ⚠️ No `LICENSE` file present — treat as all-rights-reserved until a license is added.
