# Zod Validation Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a zod-based request-body validation layer in front of every StayFlow API controller that reads `req.body`, so malformed input (wrong type, missing required field) is rejected with a uniform 400 before it reaches business logic.

**Architecture:** A single `validateBody(schema)` Express middleware (`server/src/middleware/validate.middleware.js`) runs `schema.safeParse(req.body)`; on failure it throws `ApiError.badRequest('Invalid request body', issues)`, on success it replaces `req.body` with the parsed/coerced result and calls `next()`. One schema file per resource under `server/src/schemas/`, wired into that resource's `*.routes.js` (or into `buildCrudRouter` via new `createSchema`/`updateSchema` options for the 6 resources that use it). Zod validates **shape and type only** — every existing business-logic check in the controllers (capacity limits, status-transition tables, mass-assignment allowlists via `pickAllowed`, the resident/family/vehicle inline validators, password rules) stays exactly as-is. This is a layer added in front of existing logic, not a replacement for it.

**Tech Stack:** `zod` (new dependency, MIT-licensed, no paid service — matches the project's zero-cost constraint). Node/Express/Prisma backend otherwise unchanged.

## Global Constraints

- Do not remove or alter any existing inline validation, capacity check, status-transition table, or allowlist (`pickAllowed`) — zod runs *before* the controller, controllers stay untouched except the two explicit bug-fixes called out in Task 5 and Task 9.
- Every new schema must match the corresponding Prisma model's required/optional-ness exactly (`String?` → `.optional()`, non-null → required).
- Enum fields must use the exact enum member lists from `server/prisma/schema.prisma` (`BookingStatus`, `DiningReservationStatus`, `FacilityStatus`, `TableStatus`, `GuestStatus`, `MembershipTier`). `StaffMember.role` is a **plain string** in the schema, not the `PortalRole` enum — do not enum-constrain it.
- Date fields that currently go through each controller's local `toFullDate()` helper (accepts `YYYY-MM-DD` or a full ISO datetime) must use a zod pattern that accepts both shapes — don't require full ISO only, that would reject what the frontend actually sends.
- No new test framework, no test file per resource — only Task 1 (the shared middleware) and Task 3 (booking, as the pattern example) get vitest files; the rest are verified with a quick inline `node -e` schema smoke-check per task (documented in each task) plus the existing pipeline (`npm run lint && npm run typecheck && npm test`, root) staying green throughout.

---

### Task 1: Shared validation middleware + primitives + `buildCrudRouter` support

**Files:**
- Create: `server/src/schemas/shared.js`
- Create: `server/src/middleware/validate.middleware.js`
- Create: `server/src/middleware/validate.middleware.test.js`
- Modify: `server/src/utils/crudRouter.js`
- Modify: `server/package.json` (add `zod` dependency)

**Interfaces:**
- Produces: `validateBody(schema: ZodSchema) => (req, res, next) => void` from `validate.middleware.js` — throws synchronously (Express catches sync throws in a non-async middleware, same pattern as `requireRole` in `auth.middleware.js`).
- Produces: `dateInput`, `positiveInt`, `nonEmptyString` zod schemas from `schemas/shared.js`.
- Produces: `buildCrudRouter(controller, { readRoles, writeRoles, createSchema, updateSchema })` — two new optional options, backward compatible (existing callers without them are unaffected).
- Consumes: `ApiError` from `../utils/ApiError.js`, `requireRole` from `../middleware/auth.middleware.js`.

- [ ] **Step 1: Add zod dependency**

```bash
cd server && npm install zod
```

- [ ] **Step 2: Create shared schema primitives**

`server/src/schemas/shared.js`:
```js
import { z } from 'zod'

// Accepts what every controller's local toFullDate() helper accepts: a bare
// "YYYY-MM-DD" (what <input type="date"> sends) or a full ISO datetime string.
export const dateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Must be a date string (YYYY-MM-DD or ISO datetime)')

// Whole numbers only, at least 1 — mirrors utils/validate.js's requirePositiveInt,
// as a type-check layer in front of it, not a replacement.
export const positiveInt = z.coerce.number().int().min(1)

export const nonEmptyString = z.string().trim().min(1)
```

- [ ] **Step 3: Write the failing test for validateBody**

`server/src/middleware/validate.middleware.test.js`:
```js
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validateBody } from './validate.middleware.js'

const schema = z.object({ name: z.string().min(1) })

describe('validateBody', () => {
  it('calls next and replaces req.body with the parsed data on success', () => {
    const req = { body: { name: 'Isabelle', extra: 'dropped only if schema says so' } }
    const next = vi.fn()
    validateBody(schema)(req, {}, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.body).toEqual({ name: 'Isabelle' })
  })

  it('throws a 400 ApiError on invalid input instead of calling next', () => {
    const req = { body: { name: '' } }
    const next = vi.fn()
    expect(() => validateBody(schema)(req, {}, next)).toThrowError(expect.objectContaining({ statusCode: 400 }))
    expect(next).not.toHaveBeenCalled()
  })

  it('throws when a required field is missing entirely', () => {
    const req = { body: {} }
    expect(() => validateBody(schema)(req, {}, vi.fn())).toThrowError(expect.objectContaining({ statusCode: 400 }))
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run server/src/middleware/validate.middleware.test.js`
Expected: FAIL — `validate.middleware.js` doesn't exist yet.

- [ ] **Step 5: Implement validateBody**

`server/src/middleware/validate.middleware.js`:
```js
import { ApiError } from '../utils/ApiError.js'

// Runs before the controller: validates req.body's shape/types against a zod
// schema. Existing business-logic checks (capacity, status transitions, XOR
// rules, mass-assignment allowlists, etc.) stay in the controllers untouched —
// this only catches malformed input before it gets there.
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    throw ApiError.badRequest('Invalid request body', result.error.flatten())
  }
  req.body = result.data
  next()
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run server/src/middleware/validate.middleware.test.js`
Expected: PASS (3 tests)

- [ ] **Step 7: Add createSchema/updateSchema support to buildCrudRouter**

`server/src/utils/crudRouter.js` — full replacement:
```js
import { Router } from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'

const noop = (req, res, next) => next()

export const buildCrudRouter = (controller, { readRoles, writeRoles, createSchema, updateSchema } = {}) => {
  const router = Router()
  const read = readRoles ? requireRole(...readRoles) : noop
  const write = writeRoles ? requireRole(...writeRoles) : noop
  const validateCreate = createSchema ? validateBody(createSchema) : noop
  const validateUpdate = updateSchema ? validateBody(updateSchema) : noop
  router.get('/', read, controller.list)
  router.get('/:id', read, controller.getOne)
  router.post('/', write, validateCreate, controller.create)
  router.put('/:id', write, validateUpdate, controller.update)
  router.delete('/:id', write, controller.remove)
  return router
}
```

- [ ] **Step 8: Run full suite + typecheck to confirm nothing broke**

Run: `npm run lint && npm run typecheck && npm test` (repo root)
Expected: all pass — `buildCrudRouter` callers that don't pass `createSchema`/`updateSchema` yet are unaffected (`noop`).

- [ ] **Step 9: Commit**

```bash
git add server/package.json server/package-lock.json server/src/schemas/shared.js server/src/middleware/validate.middleware.js server/src/middleware/validate.middleware.test.js server/src/utils/crudRouter.js
git commit -m "feat(validation): add zod dependency, validateBody middleware, and buildCrudRouter schema support"
git push
```

---

### Task 2: Auth schemas

**Files:**
- Create: `server/src/schemas/auth.schema.js`
- Modify: `server/src/routes/auth.routes.js`

**Interfaces:**
- Consumes: `nonEmptyString` from `../schemas/shared.js`, `validateBody` from `../middleware/validate.middleware.js`.

- [ ] **Step 1: Write the schemas**

`server/src/schemas/auth.schema.js`:
```js
import { z } from 'zod'
import { nonEmptyString } from './shared.js'

export const loginSchema = z.object({ email: nonEmptyString, password: nonEmptyString })
export const forgotPasswordSchema = z.object({ email: nonEmptyString })
export const resetPasswordSchema = z.object({ token: nonEmptyString, password: nonEmptyString })
export const requestEmailChangeSchema = z.object({ newEmail: nonEmptyString, currentPassword: nonEmptyString })
export const confirmEmailChangeSchema = z.object({ token: nonEmptyString })
export const changePasswordSchema = z.object({ currentPassword: nonEmptyString, newPassword: nonEmptyString })
```

- [ ] **Step 2: Smoke-check the schemas**

Run: `cd server && node -e "const {loginSchema}=await import('./src/schemas/auth.schema.js'); console.log(loginSchema.safeParse({email:'a@b.com',password:'x'}).success, loginSchema.safeParse({email:''}).success)" --input-type=module`
Expected: `true false`

- [ ] **Step 3: Wire into routes**

`server/src/routes/auth.routes.js` — add import and insert `validateBody(...)` into each POST route:
```js
import { Router } from 'express'
import {
  changePassword,
  confirmEmailChange,
  forgotPassword,
  login,
  logout,
  me,
  requestEmailChange,
  resetPassword,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { loginLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import {
  changePasswordSchema,
  confirmEmailChangeSchema,
  forgotPasswordSchema,
  loginSchema,
  requestEmailChangeSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js'

const router = Router()

router.post('/login', loginLimiter, validateBody(loginSchema), login)
router.post('/logout', logout)
router.post('/forgot-password', passwordResetLimiter, validateBody(forgotPasswordSchema), forgotPassword)
router.post('/reset-password', passwordResetLimiter, validateBody(resetPasswordSchema), resetPassword)
router.get('/me', requireAuth, me)
router.post('/change-password', requireAuth, passwordResetLimiter, validateBody(changePasswordSchema), changePassword)
router.post('/change-email', requireAuth, passwordResetLimiter, validateBody(requestEmailChangeSchema), requestEmailChange)
router.post('/confirm-email', passwordResetLimiter, validateBody(confirmEmailChangeSchema), confirmEmailChange)

export default router
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/auth.schema.js server/src/routes/auth.routes.js
git commit -m "feat(validation): add zod schemas for auth routes"
git push
```

---

### Task 3: Booking schemas (pattern example — has its own test file)

**Files:**
- Create: `server/src/schemas/booking.schema.js`
- Create: `server/src/schemas/booking.schema.test.js`
- Modify: `server/src/routes/booking.routes.js`

**Interfaces:**
- Consumes: `dateInput`, `nonEmptyString`, `positiveInt` from `../schemas/shared.js`.

- [ ] **Step 1: Write the failing test**

`server/src/schemas/booking.schema.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { bookingCreateSchema, bookingUpdateSchema } from './booking.schema.js'

describe('bookingCreateSchema', () => {
  it('accepts a valid create payload', () => {
    const result = bookingCreateSchema.safeParse({
      residentId: 'res-1',
      facilityId: 'fac-1',
      date: '2026-09-01',
      timeSlot: '7:00 AM – 8:30 AM',
      partySize: 2,
      notes: 'Birthday',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a payload with notes omitted', () => {
    expect(bookingCreateSchema.safeParse({ residentId: 'r', facilityId: 'f', date: '2026-09-01', timeSlot: 't', partySize: 1 }).success).toBe(true)
  })

  it('rejects a partySize below 1', () => {
    expect(bookingCreateSchema.safeParse({ residentId: 'r', facilityId: 'f', date: '2026-09-01', timeSlot: 't', partySize: 0 }).success).toBe(false)
  })

  it('rejects a malformed date', () => {
    expect(bookingCreateSchema.safeParse({ residentId: 'r', facilityId: 'f', date: 'not-a-date', timeSlot: 't', partySize: 1 }).success).toBe(false)
  })

  it('rejects a missing required field', () => {
    expect(bookingCreateSchema.safeParse({ facilityId: 'f', date: '2026-09-01', timeSlot: 't', partySize: 1 }).success).toBe(false)
  })
})

describe('bookingUpdateSchema', () => {
  it('accepts a valid status', () => {
    expect(bookingUpdateSchema.safeParse({ status: 'CONFIRMED' }).success).toBe(true)
  })

  it('rejects an invalid status value', () => {
    expect(bookingUpdateSchema.safeParse({ status: 'DELETED' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/src/schemas/booking.schema.test.js`
Expected: FAIL — `booking.schema.js` doesn't exist yet.

- [ ] **Step 3: Write the schema**

`server/src/schemas/booking.schema.js`:
```js
import { z } from 'zod'
import { dateInput, nonEmptyString, positiveInt } from './shared.js'

export const bookingCreateSchema = z.object({
  residentId: nonEmptyString,
  facilityId: nonEmptyString,
  date: dateInput,
  timeSlot: nonEmptyString,
  partySize: positiveInt,
  notes: z.string().optional(),
})

export const bookingUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED']),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/src/schemas/booking.schema.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Wire into routes**

`server/src/routes/booking.routes.js` — full replacement:
```js
import { Router } from 'express'
import { bookingController } from '../controllers/booking.controller.js'
import { BookingModel } from '../models/booking.model.js'
import { requireOwnResidentBody, requireOwnResidentParam, requireOwnerRecord, requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import { bookingCreateSchema, bookingUpdateSchema } from '../schemas/booking.schema.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownRecord = requireOwnerRecord(BookingModel)

const router = Router()
router.get('/', staffOnly, bookingController.list)
router.get('/resident/:residentId', requireOwnResidentParam(), bookingController.byResident)
router.get('/facility/:facilityId', bookingController.byFacility)
router.get('/:id', ownRecord, bookingController.getOne)
router.post('/', requireOwnResidentBody(), validateBody(bookingCreateSchema), bookingController.create)
router.put('/:id', staffOnly, validateBody(bookingUpdateSchema), bookingController.update)
router.delete('/:id', ownRecord, bookingController.remove)

export default router
```

- [ ] **Step 6: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add server/src/schemas/booking.schema.js server/src/schemas/booking.schema.test.js server/src/routes/booking.routes.js
git commit -m "feat(validation): add zod schemas for booking routes"
git push
```

---

### Task 4: Dining reservation schemas

**Files:**
- Create: `server/src/schemas/diningReservation.schema.js`
- Modify: `server/src/routes/diningReservation.routes.js`

- [ ] **Step 1: Write the schema**

`server/src/schemas/diningReservation.schema.js`:
```js
import { z } from 'zod'
import { dateInput, nonEmptyString, positiveInt } from './shared.js'

export const diningReservationCreateSchema = z.object({
  residentId: nonEmptyString,
  restaurantId: nonEmptyString,
  date: dateInput,
  time: nonEmptyString,
  partySize: positiveInt,
  occasion: z.string().optional(),
  dietary: z.string().optional(),
  seating: nonEmptyString,
})

export const diningReservationUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'PENDING', 'CANCELLED', 'ARRIVED']),
})
```

- [ ] **Step 2: Smoke-check**

Run: `cd server && node -e "const {diningReservationCreateSchema}=await import('./src/schemas/diningReservation.schema.js'); console.log(diningReservationCreateSchema.safeParse({residentId:'r',restaurantId:'x',date:'2026-09-01',time:'7:00 PM',partySize:2,seating:'Indoor'}).success)" --input-type=module`
Expected: `true`

- [ ] **Step 3: Wire into routes**

`server/src/routes/diningReservation.routes.js` — full replacement:
```js
import { Router } from 'express'
import { diningReservationController } from '../controllers/diningReservation.controller.js'
import { DiningReservationModel } from '../models/diningReservation.model.js'
import { requireOwnResidentBody, requireOwnResidentParam, requireOwnerRecord, requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import { diningReservationCreateSchema, diningReservationUpdateSchema } from '../schemas/diningReservation.schema.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownRecord = requireOwnerRecord(DiningReservationModel)

const router = Router()
router.get('/', staffOnly, diningReservationController.list)
router.get('/resident/:residentId', requireOwnResidentParam(), diningReservationController.byResident)
router.get('/:id', ownRecord, diningReservationController.getOne)
router.post('/', requireOwnResidentBody(), validateBody(diningReservationCreateSchema), diningReservationController.create)
router.put('/:id', staffOnly, validateBody(diningReservationUpdateSchema), diningReservationController.update)
router.delete('/:id', ownRecord, diningReservationController.remove)

export default router
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/diningReservation.schema.js server/src/routes/diningReservation.routes.js
git commit -m "feat(validation): add zod schemas for dining reservation routes"
git push
```

---

### Task 5: Event schemas + missing-date-guard fix

**Files:**
- Create: `server/src/schemas/event.schema.js`
- Modify: `server/src/routes/event.routes.js`
- Modify: `server/src/controllers/event.controller.js` (bug fix: `date` never went through the `toFullDate` guard other date-bearing controllers already have — a bare `YYYY-MM-DD` would currently crash Prisma with an unhandled error)

- [ ] **Step 1: Write the schema**

`server/src/schemas/event.schema.js`:
```js
import { z } from 'zod'
import { dateInput, nonEmptyString, positiveInt } from './shared.js'

export const eventCreateSchema = z.object({
  title: nonEmptyString,
  category: nonEmptyString,
  description: nonEmptyString,
  image: nonEmptyString,
  date: dateInput,
  time: nonEmptyString,
  endTime: z.string().optional(),
  location: nonEmptyString,
  capacity: positiveInt,
})

export const eventUpdateSchema = eventCreateSchema.partial()

export const eventRsvpSchema = z.object({ residentId: nonEmptyString })
```

- [ ] **Step 2: Fix the missing toFullDate guard in the controller**

`server/src/controllers/event.controller.js` — add the same guard already used in `booking.controller.js`/`diningReservation.controller.js`/`guest.controller.js`:
```js
import { EventModel } from '../models/event.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(EventModel, 'Event')

// Matches src/lib/api/event.ts's writable fields.
const FIELDS = ['title', 'category', 'description', 'image', 'date', 'time', 'endTime', 'location', 'capacity']

// A bare "YYYY-MM-DD" makes Prisma's DateTime column throw an unhandled validation
// error. Accept it defensively server-side too — same guard booking/dining/guest
// controllers already have; this one was missing it.
const toFullDate = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value)

export const eventController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const data = pickAllowed(req.body, FIELDS)
    data.date = toFullDate(data.date)
    const item = await EventModel.create(data)
    logAdminAction(req, 'CREATE', 'Event', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const data = pickAllowed(req.body, FIELDS)
    if ('date' in data) data.date = toFullDate(data.date)
    const item = await EventModel.update(req.params.id, data)
    logAdminAction(req, 'UPDATE', 'Event', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await EventModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Event', req.params.id)
    res.status(204).send()
  }),
  rsvp: asyncHandler(async (req, res) => {
    const { residentId } = req.body
    if (!residentId) throw ApiError.badRequest('residentId is required')
    const event = await EventModel.findById(req.params.id)
    if (!event) throw ApiError.notFound('Event not found')

    const alreadyAttending = event.rsvps.some((r) => r.residentId === residentId)
    if (!alreadyAttending && event.rsvps.length >= event.capacity) {
      throw ApiError.conflict('This event is fully booked')
    }

    await EventModel.addAttendee(req.params.id, residentId)
    res.status(201).json(await EventModel.findById(req.params.id))
  }),
  cancelRsvp: asyncHandler(async (req, res) => {
    const { residentId } = req.body
    if (!residentId) throw ApiError.badRequest('residentId is required')
    await EventModel.removeAttendee(req.params.id, residentId)
    res.json(await EventModel.findById(req.params.id))
  }),
}
```

- [ ] **Step 3: Wire into routes**

`server/src/routes/event.routes.js` — full replacement:
```js
import { eventController } from '../controllers/event.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { requireOwnResidentBody } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import { eventCreateSchema, eventRsvpSchema, eventUpdateSchema } from '../schemas/event.schema.js'

// MANAGEMENT-only writes: no /staff/* screen exists for event authoring, so
// STAFF write access was an unused permission, not an intended capability.
const router = buildCrudRouter(eventController, { writeRoles: ['MANAGEMENT'], createSchema: eventCreateSchema, updateSchema: eventUpdateSchema })
router.post('/:id/rsvp', requireOwnResidentBody(), validateBody(eventRsvpSchema), eventController.rsvp)
router.post('/:id/rsvp/cancel', requireOwnResidentBody(), validateBody(eventRsvpSchema), eventController.cancelRsvp)

export default router
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/event.schema.js server/src/routes/event.routes.js server/src/controllers/event.controller.js
git commit -m "feat(validation): add zod schemas for event routes, fix missing date guard"
git push
```

---

### Task 6: Facility schemas

**Files:**
- Create: `server/src/schemas/facility.schema.js`
- Modify: `server/src/routes/facility.routes.js`

- [ ] **Step 1: Write the schema**

`server/src/schemas/facility.schema.js`:
```js
import { z } from 'zod'
import { nonEmptyString, positiveInt } from './shared.js'

export const facilityCreateSchema = z.object({
  name: nonEmptyString,
  category: nonEmptyString,
  description: nonEmptyString,
  rules: z.array(z.string()),
  image: nonEmptyString,
  capacity: positiveInt,
  openHours: nonEmptyString,
  location: nonEmptyString,
  rating: z.number(),
  status: z.enum(['OPEN', 'MAINTENANCE', 'CLOSED']).optional(),
  statusReason: z.string().optional(),
})

// setFacilityStatus (frontend) PUTs only { status, statusReason } — update must
// accept any subset of the create shape.
export const facilityUpdateSchema = facilityCreateSchema.partial()
```

- [ ] **Step 2: Smoke-check**

Run: `cd server && node -e "const {facilityCreateSchema}=await import('./src/schemas/facility.schema.js'); console.log(facilityCreateSchema.safeParse({name:'Pool',category:'Wellness',description:'d',rules:[],image:'i',capacity:10,openHours:'6am-10pm',location:'Rooftop',rating:4.5}).success)" --input-type=module`
Expected: `true`

- [ ] **Step 3: Wire into routes**

`server/src/routes/facility.routes.js` — full replacement:
```js
import { facilityController } from '../controllers/facility.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { facilityCreateSchema, facilityUpdateSchema } from '../schemas/facility.schema.js'

export default buildCrudRouter(facilityController, { writeRoles: ['STAFF', 'MANAGEMENT'], createSchema: facilityCreateSchema, updateSchema: facilityUpdateSchema })
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/facility.schema.js server/src/routes/facility.routes.js
git commit -m "feat(validation): add zod schemas for facility routes"
git push
```

---

### Task 7: Notice schemas

**Files:**
- Create: `server/src/schemas/notice.schema.js`
- Modify: `server/src/routes/notice.routes.js`

- [ ] **Step 1: Write the schema**

`server/src/schemas/notice.schema.js`:
```js
import { z } from 'zod'
import { nonEmptyString } from './shared.js'

// postedBy/postedAt are always server-set in the controller — never part of the
// client-facing schema.
export const noticeCreateSchema = z.object({
  title: nonEmptyString,
  category: nonEmptyString,
  body: nonEmptyString,
  pinned: z.boolean().optional(),
})

export const noticeUpdateSchema = noticeCreateSchema.partial()
```

- [ ] **Step 2: Smoke-check**

Run: `cd server && node -e "const {noticeCreateSchema}=await import('./src/schemas/notice.schema.js'); console.log(noticeCreateSchema.safeParse({title:'t',category:'General',body:'b'}).success)" --input-type=module`
Expected: `true`

- [ ] **Step 3: Wire into routes**

`server/src/routes/notice.routes.js` — full replacement:
```js
import { noticeController } from '../controllers/notice.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { noticeCreateSchema, noticeUpdateSchema } from '../schemas/notice.schema.js'

// MANAGEMENT-only writes: no /staff/* screen exists for notice authoring, so
// STAFF write access was an unused permission, not an intended capability.
export default buildCrudRouter(noticeController, { writeRoles: ['MANAGEMENT'], createSchema: noticeCreateSchema, updateSchema: noticeUpdateSchema })
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/notice.schema.js server/src/routes/notice.routes.js
git commit -m "feat(validation): add zod schemas for notice routes"
git push
```

---

### Task 8: Notification schema

**Files:**
- Create: `server/src/schemas/notification.schema.js`
- Modify: `server/src/routes/notification.routes.js`

- [ ] **Step 1: Write the schema**

`server/src/schemas/notification.schema.js`:
```js
import { z } from 'zod'
import { nonEmptyString } from './shared.js'

// kind/title/body non-empty and the residentId-XOR-staffId rule are already
// enforced inline in the controller — this only adds the type/shape layer.
export const notificationCreateSchema = z.object({
  kind: nonEmptyString,
  title: nonEmptyString,
  body: nonEmptyString,
  residentId: z.string().optional(),
  staffId: z.string().optional(),
})
```

- [ ] **Step 2: Smoke-check**

Run: `cd server && node -e "const {notificationCreateSchema}=await import('./src/schemas/notification.schema.js'); console.log(notificationCreateSchema.safeParse({kind:'booking',title:'t',body:'b',residentId:'r'}).success)" --input-type=module`
Expected: `true`

- [ ] **Step 3: Wire into routes**

`server/src/routes/notification.routes.js` — modify only the `POST /` line (rest unchanged):
```js
import { Router } from 'express'
import { notificationController } from '../controllers/notification.controller.js'
import { NotificationModel } from '../models/notification.model.js'
import { requireOwnNotification, requireOwnResidentParam, requireOwnStaffParam, requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import { notificationCreateSchema } from '../schemas/notification.schema.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownNotification = requireOwnNotification(NotificationModel)

const router = Router()
router.get('/', staffOnly, notificationController.list)
router.get('/resident/:residentId', requireOwnResidentParam(), notificationController.byResident)
router.get('/staff/:staffId', requireOwnStaffParam(), notificationController.byStaff)
router.post('/', staffOnly, validateBody(notificationCreateSchema), notificationController.create)
router.post('/:id/read', ownNotification, notificationController.markRead)
router.post('/resident/:residentId/read-all', requireOwnResidentParam(), notificationController.markAllRead)
router.post('/staff/:staffId/read-all', requireOwnStaffParam(), notificationController.markAllReadStaff)
router.post('/read-all', requireRole('MANAGEMENT'), notificationController.markAllReadGlobal)
router.delete('/:id', staffOnly, notificationController.remove)

export default router
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/notification.schema.js server/src/routes/notification.routes.js
git commit -m "feat(validation): add zod schema for notification create route"
git push
```

---

### Task 9: Resident schemas (admin + self) + missing-date-guard fix

**Files:**
- Create: `server/src/schemas/resident.schema.js`
- Modify: `server/src/routes/resident.routes.js`
- Modify: `server/src/controllers/resident.controller.js` (bug fix: `moveInDate` never went through a `toFullDate`-style guard — a bare `YYYY-MM-DD` would currently crash Prisma with an unhandled error, same bug class as Task 5)

- [ ] **Step 1: Write the schemas**

`server/src/schemas/resident.schema.js`:
```js
import { z } from 'zod'
import { dateInput, nonEmptyString } from './shared.js'

export const residentAdminCreateSchema = z.object({
  name: nonEmptyString,
  email: nonEmptyString,
  phone: nonEmptyString,
  unit: nonEmptyString,
  tier: z.enum(['SIGNATURE', 'PRESTIGE', 'ELITE']),
  avatarSeed: nonEmptyString,
  avatarStyle: z.string().optional(),
  moveInDate: dateInput,
  dietary: z.array(z.string()),
  notifications: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  emergencyName: nonEmptyString,
  emergencyRelation: nonEmptyString,
  emergencyPhone: nonEmptyString,
})

export const residentAdminUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  email: nonEmptyString.optional(),
  unit: nonEmptyString.optional(),
  tier: z.enum(['SIGNATURE', 'PRESTIGE', 'ELITE']).optional(),
})

// Matches SELF_EDITABLE_FIELDS in resident.controller.js. dietary's array-shape/
// dedup logic stays inline in the controller — this only checks it's an array.
export const residentSelfUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  phone: nonEmptyString.optional(),
  dietary: z.array(z.unknown()).optional(),
  notifications: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  emergencyName: nonEmptyString.optional(),
  emergencyRelation: nonEmptyString.optional(),
  emergencyPhone: nonEmptyString.optional(),
  emergency2Name: z.string().optional(),
  emergency2Relation: z.string().optional(),
  emergency2Phone: z.string().optional(),
  avatarSeed: nonEmptyString.optional(),
  avatarStyle: z.string().optional(),
})

// name/relation required non-empty (already enforced inline via requireString);
// age's 0-130 integer check also stays inline — this only checks presence/type.
export const familyMemberSchema = z.object({
  name: nonEmptyString,
  relation: nonEmptyString,
  age: z.union([z.number(), z.string()]),
})

export const vehicleSchema = z.object({
  make: nonEmptyString,
  model: nonEmptyString,
  plate: nonEmptyString,
  color: nonEmptyString,
})
```

- [ ] **Step 2: Fix the missing toFullDate guard for moveInDate**

`server/src/controllers/resident.controller.js` — modify only the `create` handler and imports (rest of file unchanged):
```js
import bcrypt from 'bcryptjs'
import { ResidentModel } from '../models/resident.model.js'
import { UserModel } from '../models/user.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'
import { BCRYPT_ROUNDS, generateTempPassword } from '../utils/password.js'

const base = buildCrudController(ResidentModel, 'Resident')

const ADMIN_CREATE_FIELDS = [
  'name',
  'email',
  'phone',
  'unit',
  'tier',
  'avatarSeed',
  'avatarStyle',
  'moveInDate',
  'dietary',
  'notifications',
  'newsletter',
  'emergencyName',
  'emergencyRelation',
  'emergencyPhone',
]
const ADMIN_UPDATE_FIELDS = ['name', 'email', 'unit', 'tier']

// A bare "YYYY-MM-DD" makes Prisma's DateTime column throw an unhandled validation
// error. Accept it defensively server-side too — same guard booking/dining/guest/
// event controllers already have; moveInDate was missing it.
const toFullDate = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value)

export const residentController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const data = pickAllowed(req.body, ADMIN_CREATE_FIELDS)
    data.moveInDate = toFullDate(data.moveInDate)
    const item = await ResidentModel.create(data)
    logAdminAction(req, 'CREATE', 'Resident', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const item = await ResidentModel.update(req.params.id, pickAllowed(req.body, ADMIN_UPDATE_FIELDS))
    logAdminAction(req, 'UPDATE', 'Resident', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await ResidentModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Resident', req.params.id)
    res.status(204).send()
  }),
  createLogin: asyncHandler(async (req, res) => {
    const resident = await ResidentModel.findById(req.params.id)
    if (!resident) throw ApiError.notFound('Resident not found')

    const existingLogin = await UserModel.findByResidentId(resident.id)
    if (existingLogin) throw ApiError.conflict('This resident already has a login.')

    const emailTaken = await UserModel.findByEmail(resident.email)
    if (emailTaken) throw ApiError.conflict('A login already exists for this email address.')

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS)
    const user = await UserModel.create({
      email: resident.email,
      passwordHash,
      role: 'MEMBER',
      displayName: resident.name,
      residentId: resident.id,
      mustChangePassword: true,
    })
    logAdminAction(req, 'CREATE', 'ResidentLogin', resident.id)

    res.status(201).json({
      resident: { ...resident, user: { id: user.id, mustChangePassword: true } },
      tempPassword,
      email: user.email,
    })
  }),
}
```
(`residentSelfController` below this in the same file is unchanged — leave it exactly as-is.)

- [ ] **Step 3: Wire into routes**

`server/src/routes/resident.routes.js` — full replacement:
```js
import { Router } from 'express'
import { residentController, residentSelfController } from '../controllers/resident.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { requireRole } from '../middleware/auth.middleware.js'
import { createLoginLimiter } from '../middleware/rateLimit.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import {
  familyMemberSchema,
  residentAdminCreateSchema,
  residentAdminUpdateSchema,
  residentSelfUpdateSchema,
  vehicleSchema,
} from '../schemas/resident.schema.js'

const router = Router()

// Self routes first so "me" is never captured by the CRUD "/:id" param route.
// Any authenticated user with a linked residentId (i.e. MEMBERs) may use these.
router.get('/me', residentSelfController.getMe)
router.put('/me', validateBody(residentSelfUpdateSchema), residentSelfController.updateMe)

router.post('/me/family', validateBody(familyMemberSchema), residentSelfController.addFamilyMember)
router.put('/me/family/:id', validateBody(familyMemberSchema), residentSelfController.updateFamilyMember)
router.delete('/me/family/:id', residentSelfController.removeFamilyMember)

router.post('/me/vehicles', validateBody(vehicleSchema), residentSelfController.addVehicle)
router.put('/me/vehicles/:id', validateBody(vehicleSchema), residentSelfController.updateVehicle)
router.delete('/me/vehicles/:id', residentSelfController.removeVehicle)

router.post('/me/notices-seen', residentSelfController.markNoticesSeen)

router.post('/:id/create-login', requireRole('MANAGEMENT'), createLoginLimiter, residentController.createLogin)

router.use(
  buildCrudRouter(residentController, {
    readRoles: ['STAFF', 'MANAGEMENT'],
    writeRoles: ['MANAGEMENT'],
    createSchema: residentAdminCreateSchema,
    updateSchema: residentAdminUpdateSchema,
  }),
)

export default router
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/resident.schema.js server/src/routes/resident.routes.js server/src/controllers/resident.controller.js
git commit -m "feat(validation): add zod schemas for resident routes, fix missing moveInDate guard"
git push
```

---

### Task 10: Restaurant schemas

**Files:**
- Create: `server/src/schemas/restaurant.schema.js`
- Modify: `server/src/routes/restaurant.routes.js`

- [ ] **Step 1: Write the schema**

`server/src/schemas/restaurant.schema.js`:
```js
import { z } from 'zod'
import { nonEmptyString, positiveInt } from './shared.js'

export const restaurantCreateSchema = z.object({
  name: nonEmptyString,
  cuisine: nonEmptyString,
  description: nonEmptyString,
  image: nonEmptyString,
  openHours: nonEmptyString,
  priceRange: nonEmptyString,
  rating: z.number(),
  location: nonEmptyString,
  maxPartySize: positiveInt,
})

export const restaurantUpdateSchema = restaurantCreateSchema.partial()
```

- [ ] **Step 2: Smoke-check**

Run: `cd server && node -e "const {restaurantCreateSchema}=await import('./src/schemas/restaurant.schema.js'); console.log(restaurantCreateSchema.safeParse({name:'Bistro',cuisine:'French',description:'d',image:'i',openHours:'6-10',priceRange:'$$$',rating:4.2,location:'Lobby',maxPartySize:8}).success)" --input-type=module`
Expected: `true`

- [ ] **Step 3: Wire into routes**

`server/src/routes/restaurant.routes.js` — full replacement:
```js
import { restaurantController } from '../controllers/restaurant.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { restaurantCreateSchema, restaurantUpdateSchema } from '../schemas/restaurant.schema.js'

// MANAGEMENT-only writes: no /staff/* screen exists for restaurant management, so
// STAFF write access was an unused permission, not an intended capability.
export default buildCrudRouter(restaurantController, { writeRoles: ['MANAGEMENT'], createSchema: restaurantCreateSchema, updateSchema: restaurantUpdateSchema })
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/restaurant.schema.js server/src/routes/restaurant.routes.js
git commit -m "feat(validation): add zod schemas for restaurant routes"
git push
```

---

### Task 11: Staff schemas

**Files:**
- Create: `server/src/schemas/staff.schema.js`
- Modify: `server/src/routes/staff.routes.js`

- [ ] **Step 1: Write the schema**

`server/src/schemas/staff.schema.js`:
```js
import { z } from 'zod'
import { nonEmptyString } from './shared.js'

// StaffMember.role is a plain free-text string in the Prisma schema (e.g.
// "Facilities Manager"), NOT the PortalRole enum — do not z.enum() it.
export const staffCreateSchema = z.object({
  name: nonEmptyString,
  role: nonEmptyString,
  email: nonEmptyString,
  shift: nonEmptyString,
  avatarSeed: nonEmptyString,
})

// avatarSeed is deliberately excluded — updateStaffMember never touches it once set.
export const staffUpdateSchema = z.object({
  name: nonEmptyString.optional(),
  role: nonEmptyString.optional(),
  email: nonEmptyString.optional(),
  shift: nonEmptyString.optional(),
})
```

- [ ] **Step 2: Smoke-check**

Run: `cd server && node -e "const {staffCreateSchema}=await import('./src/schemas/staff.schema.js'); console.log(staffCreateSchema.safeParse({name:'Renata',role:'Facilities Manager',email:'r@x.com',shift:'Morning',avatarSeed:'Renata'}).success)" --input-type=module`
Expected: `true`

- [ ] **Step 3: Wire into routes**

`server/src/routes/staff.routes.js` — full replacement:
```js
import { staffController } from '../controllers/staff.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { staffCreateSchema, staffUpdateSchema } from '../schemas/staff.schema.js'

export default buildCrudRouter(staffController, {
  readRoles: ['STAFF', 'MANAGEMENT'],
  writeRoles: ['MANAGEMENT'],
  createSchema: staffCreateSchema,
  updateSchema: staffUpdateSchema,
})
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/staff.schema.js server/src/routes/staff.routes.js
git commit -m "feat(validation): add zod schemas for staff routes"
git push
```

---

### Task 12: Table schemas

**Files:**
- Create: `server/src/schemas/table.schema.js`
- Modify: `server/src/routes/table.routes.js`

- [ ] **Step 1: Write the schema**

`server/src/schemas/table.schema.js`:
```js
import { z } from 'zod'
import { nonEmptyString, positiveInt } from './shared.js'

export const tableCreateSchema = z.object({
  restaurantId: nonEmptyString,
  label: nonEmptyString,
  seats: positiveInt,
  status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED']).optional(),
})

export const tableUpdateSchema = tableCreateSchema.partial()
```

- [ ] **Step 2: Smoke-check**

Run: `cd server && node -e "const {tableCreateSchema}=await import('./src/schemas/table.schema.js'); console.log(tableCreateSchema.safeParse({restaurantId:'r',label:'T1',seats:4}).success)" --input-type=module`
Expected: `true`

- [ ] **Step 3: Wire into routes**

`server/src/routes/table.routes.js` — full replacement:
```js
import { tableController } from '../controllers/table.controller.js'
import { buildCrudRouter } from '../utils/crudRouter.js'
import { tableCreateSchema, tableUpdateSchema } from '../schemas/table.schema.js'

// MANAGEMENT-only writes: no /staff/* screen exists for table management, so
// STAFF write access was an unused permission, not an intended capability.
const router = buildCrudRouter(tableController, { writeRoles: ['MANAGEMENT'], createSchema: tableCreateSchema, updateSchema: tableUpdateSchema })
router.get('/restaurant/:restaurantId', tableController.byRestaurant)

export default router
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/table.schema.js server/src/routes/table.routes.js
git commit -m "feat(validation): add zod schemas for table routes"
git push
```

---

### Task 13: Guest schemas

**Files:**
- Create: `server/src/schemas/guest.schema.js`
- Modify: `server/src/routes/guest.routes.js`

- [ ] **Step 1: Write the schema**

`server/src/schemas/guest.schema.js`:
```js
import { z } from 'zod'
import { dateInput, nonEmptyString } from './shared.js'

export const guestCreateSchema = z.object({
  hostResidentId: nonEmptyString,
  name: nonEmptyString,
  purpose: nonEmptyString,
  vehiclePlate: z.string().optional(),
  arrivalDate: dateInput,
  arrivalTime: nonEmptyString,
})

// Superset of both MEMBER_EDITABLE and STAFF_EDITABLE (controller.js) — the
// role-based field restriction and status-transition table stay in the
// controller; this only type-checks whatever the caller actually sent.
export const guestUpdateSchema = z.object({
  hostResidentId: nonEmptyString.optional(),
  name: nonEmptyString.optional(),
  purpose: nonEmptyString.optional(),
  vehiclePlate: z.string().optional(),
  arrivalDate: dateInput.optional(),
  arrivalTime: nonEmptyString.optional(),
  status: z.enum(['PENDING', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT']).optional(),
})
```

- [ ] **Step 2: Smoke-check**

Run: `cd server && node -e "const {guestCreateSchema}=await import('./src/schemas/guest.schema.js'); console.log(guestCreateSchema.safeParse({hostResidentId:'r',name:'Harrison',purpose:'Visit',arrivalDate:'2026-09-01',arrivalTime:'2:00 PM'}).success)" --input-type=module`
Expected: `true`

- [ ] **Step 3: Wire into routes**

`server/src/routes/guest.routes.js` — full replacement:
```js
import { Router } from 'express'
import { guestController } from '../controllers/guest.controller.js'
import { GuestModel } from '../models/guest.model.js'
import { requireOwnResidentBody, requireOwnResidentParam, requireOwnerRecord, requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'
import { guestCreateSchema, guestUpdateSchema } from '../schemas/guest.schema.js'

const staffOnly = requireRole('STAFF', 'MANAGEMENT')
const ownRecord = requireOwnerRecord(GuestModel, 'hostResidentId')

const router = Router()
router.get('/', staffOnly, guestController.list)
router.get('/resident/:residentId', requireOwnResidentParam(), guestController.byResident)
router.get('/:id', ownRecord, guestController.getOne)
router.post('/', requireOwnResidentBody('hostResidentId'), validateBody(guestCreateSchema), guestController.create)
router.put('/:id', ownRecord, validateBody(guestUpdateSchema), guestController.update)
router.delete('/:id', ownRecord, guestController.remove)
router.post('/:id/check-in', staffOnly, guestController.checkIn)
router.post('/:id/check-out', staffOnly, guestController.checkOut)

export default router
```

- [ ] **Step 4: Verify pipeline still green**

Run: `npm run lint && npm run typecheck && npm test` (repo root)

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas/guest.schema.js server/src/routes/guest.routes.js
git commit -m "feat(validation): add zod schemas for guest routes"
git push
```

---

## Final verification (after Task 13)

- [ ] Run `npm run lint && npm run typecheck && npm test && npm run build` from repo root — all green.
- [ ] Manually smoke-test one write endpoint end-to-end against a real request (e.g. `POST /api/bookings` with a missing `partySize`) to confirm a 400 with a clean `Invalid request body` message comes back through the real Express app, not just the isolated schema.
