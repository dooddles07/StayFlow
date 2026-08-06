# StayFlow — Product Requirements Document

> For engineering detail see [ARCHITECTURE.md](ARCHITECTURE.md), [SCHEMA.md](SCHEMA.md), [RULES.md](RULES.md).

## Problem

Residential community operations (amenity bookings, private dining, guest access, events, notices) run on phone calls and paper. No shared system of record for residents, front desk, or management.

## Solution

Single-tenant web platform, three role-gated portals on one app:

- **Member** — residents self-serve bookings, dining, guests, events, notices.
- **Staff** — front desk / facilities operate day-to-day (confirm bookings, check guests in/out).
- **Management** — oversight: staff/resident directories, analytics, reports.

## Users

| Role       | Who                     | Primary jobs-to-be-done                                                                                           |
| ---------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Member     | Resident                | Book amenities, reserve dining, register guests, RSVP events, read notices                                        |
| Staff      | Front desk / facilities | Confirm bookings, manage guest check-in/out, maintain facility/restaurant/table/event/notice data                 |
| Management | Building admin          | Everything Staff does, plus staff/resident directory management, issuing resident logins at intake, and analytics |

## Core features

- Role-based auth (JWT, httpOnly cookie), account lockout, audit trail, password reset.
- Resident onboarding is management-issued, not self-service: a resident visits in person, management creates their profile and login together, hands over a temporary password, and the resident is forced to set their own on first sign-in.
- Facility booking with capacity-aware slot conflict prevention (atomic, race-safe).
- Restaurant / table dining reservations with per-restaurant max party size.
- Guest passes: register → approve → QR check-in → check-out lifecycle.
- Community events with RSVP.
- Notices (announcements) with unread tracking.
- In-app notifications, live-polled.
- Management analytics/reports.

## Out of scope (current)

- Payments and billing: no gateway integrated.
- Scheduled reminders: no queue or job scheduler exists. The only recurring task is an in-process hourly retention sweep.
- Third-party auth / SSO.
- Multi-tenant support: single-tenant only.

## Success criteria

- No double-booking of facilities or dining tables under concurrent requests.
- Portal access strictly scoped by role; residents cannot see other residents' data.
- Guest pass lifecycle fully auditable via QR + check-in/out timestamps.

## Roadmap / future improvements

Shipped since this list was first written — see [SECURITY.md](SECURITY.md) and [HANDOVER.md](HANDOVER.md) for detail: CI gate (lint + typecheck + coverage-gated tests + build + migration-drift check + secret scan), Origin-check CSRF middleware, and observability (structured JSON logs, request IDs, Sentry error tracking on API + browser).

Still open:

- Payment/billing if monetizing bookings or dining.
- Background jobs (reminders, guest-pass expiry) via a real queue/scheduler — the only recurring task today is an in-process hourly retention sweep, which skips a cycle if the free-tier instance is idle/suspended.
- Redis-backed rate limiting once more than one API instance runs (current counters are in-memory, correct only on a single instance).
- Load testing — no endpoint throughput has been established.
