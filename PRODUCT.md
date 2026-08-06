# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

| Role       | Who                     | Primary jobs-to-be-done                                                                                           |
| ---------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Member     | Resident                | Book amenities, reserve dining, register guests, RSVP events, read notices                                        |
| Staff      | Front desk / facilities | Confirm bookings, manage guest check-in/out, maintain facility/restaurant/table/event/notice data                 |
| Management | Building admin          | Everything Staff does, plus staff/resident directory management, issuing resident logins at intake, and analytics |

## Product Purpose

Replaces phone-call-and-paper operations for residential community amenity bookings, private dining, guest access, events, and notices with a single shared system of record. Success: no double-booking under concurrent requests, and portal access strictly scoped by role.

## Positioning

Generic, multi-property product intended to be deployed across different residential communities (HOAs, condos, buildings) rather than built for one specific building. No pilot property or deployment target is confirmed yet.

## Operating Context

Three role-gated portals on one single-tenant app: Member, Staff, Management. Resident onboarding is management-issued (in-person, temp password, forced reset on first login) rather than self-service. Staff commonly operate on tablets at a front desk.

## Capabilities and Constraints

- Role-based auth (JWT, httpOnly cookie), account lockout, audit trail, password reset.
- Facility booking with capacity-aware, atomic, race-safe slot conflict prevention.
- Restaurant/table dining reservations with per-restaurant max party size.
- Guest passes: register -> approve -> QR check-in -> check-out lifecycle, fully auditable via timestamps.
- Community events with RSVP; notices with unread tracking; live-polled in-app notifications.
- Management analytics/reports.
- Out of scope currently: payments/billing, scheduled reminders/job scheduler (only an in-process hourly retention sweep exists), third-party auth/SSO, multi-tenant support.

## Brand Commitments

Product name "StayFlow" is fixed. No other brand assets or identity constraints confirmed.

## Evidence on Hand

All placeholder currently: no real building name/branding, real photos, pilot property, or testimonials exist. Future design work must not fabricate testimonials, case studies, or a specific building identity as if real.

## Product Principles

- Single shared system of record replaces informal phone/paper coordination.
- Strict role scoping: residents never see other residents' data.
- Correctness under concurrency (no double-booking) is a hard requirement, not an optimization.
- Staff-facing surfaces must hold up on tablet/touch use at a front desk.
- Generic/multi-property by design; avoid baking in one building's identity as if it were universal.

## Accessibility & Inclusion

Plain-language, non-technical UI copy (residents are not assumed technical). Skip link on every page, mobile touch targets sized for tablet use, password visibility toggles, structured arrival-time picker instead of raw text input.
