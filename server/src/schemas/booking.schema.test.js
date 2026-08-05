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
    expect(
      bookingCreateSchema.safeParse({
        residentId: 'r',
        facilityId: 'f',
        date: '2026-09-01',
        timeSlot: 't',
        partySize: 1,
      }).success,
    ).toBe(true)
  })

  it('rejects a partySize below 1', () => {
    expect(
      bookingCreateSchema.safeParse({
        residentId: 'r',
        facilityId: 'f',
        date: '2026-09-01',
        timeSlot: 't',
        partySize: 0,
      }).success,
    ).toBe(false)
  })

  it('rejects a malformed date', () => {
    expect(
      bookingCreateSchema.safeParse({
        residentId: 'r',
        facilityId: 'f',
        date: 'not-a-date',
        timeSlot: 't',
        partySize: 1,
      }).success,
    ).toBe(false)
  })

  it('rejects a missing required field', () => {
    expect(
      bookingCreateSchema.safeParse({
        facilityId: 'f',
        date: '2026-09-01',
        timeSlot: 't',
        partySize: 1,
      }).success,
    ).toBe(false)
  })
})

describe('bookingUpdateSchema', () => {
  it('accepts a valid status', () => {
    expect(bookingUpdateSchema.safeParse({ status: 'CONFIRMED' }).success).toBe(
      true,
    )
  })

  it('rejects an invalid status value', () => {
    expect(bookingUpdateSchema.safeParse({ status: 'DELETED' }).success).toBe(
      false,
    )
  })
})
