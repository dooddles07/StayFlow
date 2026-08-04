// Real analytics derived from live booking/reservation/resident/guest data.
// Counterpart to lib/mock/analytics.ts, which still backs the handful of charts
// (dining revenue, member engagement) that need data this schema doesn't track yet.
import { FACILITY_TIME_SLOTS } from './booking-slots'
import type { BookingView } from './api/booking'
import type { ReservationView } from './api/diningReservation'
import type { GuestView } from './api/guest'
import type { ResidentProfile } from './api/resident'
import type { Facility } from './mock/types'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function parseHourLabel(time: string): { hour: number; label: string } | null {
  const match = /^(\d{1,2}):\d{2}\s*(AM|PM)$/i.exec(time.trim())
  if (!match) return null
  let hour = Number(match[1]) % 12
  if (match[2].toUpperCase() === 'PM') hour += 12
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return { hour, label: `${hour12} ${period}` }
}

// Utilization window: bookings within ±15 days of today against the fixed 7 daily
// slots every facility offers (see FACILITY_TIME_SLOTS) — the closest real proxy to
// occupancy this schema supports, since facilities have no explicit slot inventory.
export function facilityUtilization(facilities: Facility[], bookings: BookingView[]) {
  const WINDOW_DAYS = 30
  const now = Date.now()
  const windowStart = now - 15 * 86400000
  const windowEnd = now + 15 * 86400000
  const totalSlots = FACILITY_TIME_SLOTS.length * WINDOW_DAYS

  return facilities.map((f) => {
    const booked = bookings.filter((b) => {
      if (b.facilityId !== f.id || b.status === 'cancelled') return false
      const t = new Date(b.date).getTime()
      return t >= windowStart && t <= windowEnd
    }).length
    return { name: f.name, utilization: Math.min(100, Math.round((booked / totalSlots) * 100)) }
  })
}

export function facilityPeakHours(bookings: BookingView[]) {
  const counts = new Map(FACILITY_TIME_SLOTS.map((slot) => [slot, 0]))
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    if (counts.has(b.timeSlot)) counts.set(b.timeSlot, counts.get(b.timeSlot)! + 1)
  }
  return FACILITY_TIME_SLOTS.map((slot) => ({
    hour: slot.split('–')[0].trim(),
    bookings: counts.get(slot) ?? 0,
  }))
}

export function diningPopularTimes(reservations: ReservationView[]) {
  const counts = new Map<number, { label: string; count: number }>()
  for (const r of reservations) {
    if (r.status === 'cancelled') continue
    const parsed = parseHourLabel(r.time)
    if (!parsed) continue
    const entry = counts.get(parsed.hour)
    if (entry) entry.count += 1
    else counts.set(parsed.hour, { label: parsed.label, count: 1 })
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, { label, count }]) => ({ time: label, reservations: count }))
}

// "Active" has no real meaning without churn/login tracking — this is a cumulative
// sign-up count by month end, the closest honest proxy available from moveInDate alone.
export function memberGrowth(residents: ResidentProfile[]) {
  const now = new Date()
  const months: { key: string; label: string; monthEnd: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59).getTime()
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()], monthEnd })
  }
  const moveIns = residents.map((r) => new Date(r.moveInDate).getTime())
  return months.map(({ key, label, monthEnd }) => {
    const [y, m] = key.split('-').map(Number)
    const monthStart = new Date(y, m, 1).getTime()
    return {
      month: label,
      active: moveIns.filter((t) => t <= monthEnd).length,
      new: moveIns.filter((t) => t >= monthStart && t <= monthEnd).length,
    }
  })
}

export function guestTraffic(guests: GuestView[]) {
  const now = new Date()
  const dayOfWeek = (now.getDay() + 6) % 7 // 0 = Monday
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - dayOfWeek)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 7)

  const counts = new Array(7).fill(0)
  for (const g of guests) {
    const t = new Date(g.arrivalDate).getTime()
    if (t < monday.getTime() || t >= sunday.getTime()) continue
    const idx = Math.floor((t - monday.getTime()) / 86400000)
    if (idx >= 0 && idx < 7) counts[idx] += 1
  }
  return DAY_LABELS.map((day, i) => ({ day, guests: counts[i] }))
}

export function guestFrequent(guests: GuestView[], limit = 5) {
  const cutoff = Date.now() - 90 * 86400000
  const counts = new Map<string, { name: string; visits: number }>()
  for (const g of guests) {
    if (new Date(g.arrivalDate).getTime() < cutoff) continue
    const key = g.name.trim().toLowerCase()
    const entry = counts.get(key)
    if (entry) entry.visits += 1
    else counts.set(key, { name: g.name.trim(), visits: 1 })
  }
  return [...counts.values()].sort((a, b) => b.visits - a.visits).slice(0, limit)
}
