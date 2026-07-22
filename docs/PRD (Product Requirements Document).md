# StayFlow — Product Requirements Document

> For engineering detail see [Architecture.md](Architecture.md), [Schema.md](Schema.md), [Rules.md](Rules.md).

## Problem

Residential community operations (amenity bookings, private dining, guest access, events, notices) run on phone calls and paper. No shared system of record for residents, front desk, or management.

## Solution

Single-tenant web platform, three role-gated portals on one app:

- **Member** — residents self-serve bookings, dining, guests, events, notices.
- **Staff** — front desk / facilities operate day-to-day (confirm bookings, check guests in/out).
- **Management** — oversight: staff/resident directories, analytics, reports.

## Users

| Role | Who | Primary jobs-to-be-done |
| --- | --- | --- |
| Member | Resident | Book amenities, reserve dining, register guests, RSVP events, read notices |
| Staff | Front desk / facilities | Confirm bookings, manage guest check-in/out, maintain facility/restaurant/table/event/notice data |
| Management | Building admin | Everything Staff does, plus staff/resident directory management, issuing resident logins at intake, and analytics |

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

- Payments / billing — no gateway integrated.
- Background jobs / scheduled reminders — no queue or scheduler exists.
- Third-party auth / SSO.
- Multi-tenant support — single-tenant only.

## Success criteria

- No double-booking of facilities or dining tables under concurrent requests.
- Portal access strictly scoped by role; residents cannot see other residents' data.
- Guest pass lifecycle fully auditable via QR + check-in/out timestamps.

## Roadmap / future improvements

- Configure `RESEND_API_KEY` in the production environment — the mailer integration itself is built, just not turned on (falls back to console-logging reset/email-change links without it).
- Payment/billing if monetizing bookings or dining.
- Anti-CSRF tokens for cookie-based mutations.
- CI gate (lint + test + typecheck).
- Integration/E2E test suite + coverage thresholds.
- Background jobs (reminders, guest-pass expiry) via queue/scheduler.
- Observability: structured logs, tracing, error tracking.
