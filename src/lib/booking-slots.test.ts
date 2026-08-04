import { describe, it, expect } from 'vitest'
import { timeToMinutes, nextDays, toDateKey, clampPositiveInt, clampPartySize, FACILITY_TIME_SLOTS } from './booking-slots'

describe('timeToMinutes', () => {
  it('converts AM times correctly', () => {
    expect(timeToMinutes('9:00 AM')).toBe(9 * 60)
  })

  it('converts PM times correctly, including 12 PM as noon', () => {
    expect(timeToMinutes('12:00 PM')).toBe(12 * 60)
    expect(timeToMinutes('1:00 PM')).toBe(13 * 60)
  })

  it('treats 12 AM as midnight', () => {
    expect(timeToMinutes('12:00 AM')).toBe(0)
  })

  it('parses the leading time out of a range string', () => {
    expect(timeToMinutes(FACILITY_TIME_SLOTS[0])).toBe(timeToMinutes('7:00 AM'))
  })

  it('sorts slot strings by actual time, not lexically', () => {
    const sorted = [...FACILITY_TIME_SLOTS].sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
    expect(sorted).toEqual(FACILITY_TIME_SLOTS)
  })

  it('falls back to 0 for unparseable input', () => {
    expect(timeToMinutes('not a time')).toBe(0)
  })
})

describe('nextDays', () => {
  it('returns the requested count of consecutive days starting today', () => {
    const days = nextDays(5)
    expect(days).toHaveLength(5)
    for (let i = 1; i < days.length; i++) {
      expect(days[i].getTime() - days[i - 1].getTime()).toBe(24 * 60 * 60 * 1000)
    }
  })

  it('zeroes out the time component', () => {
    const [first] = nextDays(1)
    expect(first.getHours()).toBe(0)
    expect(first.getMinutes()).toBe(0)
  })
})

describe('toDateKey', () => {
  it('formats as YYYY-MM-DD with zero-padding', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('clampPositiveInt', () => {
  it('accepts a valid positive integer', () => {
    expect(clampPositiveInt('4')).toBe(4)
  })

  it('floors a decimal', () => {
    expect(clampPositiveInt('4.9')).toBe(4)
  })

  it('falls back on zero, negative, or invalid input', () => {
    expect(clampPositiveInt('0')).toBe(1)
    expect(clampPositiveInt('-5')).toBe(1)
    expect(clampPositiveInt('abc')).toBe(1)
    expect(clampPositiveInt('abc', 3)).toBe(3)
  })
})

describe('clampPartySize', () => {
  it('caps at the given max', () => {
    expect(clampPartySize('10', 6)).toBe(6)
  })

  it('passes through valid values under the max', () => {
    expect(clampPartySize('3', 6)).toBe(3)
  })
})
