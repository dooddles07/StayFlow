export const FACILITY_TIME_SLOTS = [
  '7:00 AM – 8:30 AM',
  '9:00 AM – 10:30 AM',
  '11:00 AM – 12:30 PM',
  '1:00 PM – 2:30 PM',
  '3:00 PM – 4:30 PM',
  '5:00 PM – 6:30 PM',
  '7:00 PM – 8:30 PM',
]

export function nextDays(count: number): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
