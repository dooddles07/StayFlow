import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { AlertTriangle, CalendarClock, ClipboardList, UtensilsCrossed, Users } from 'lucide-react'
import { KpiCard } from '#/components/stayflow/kpi-card'
import { SectionHeader } from '#/components/stayflow/section-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { EmptyState } from '#/components/stayflow/empty-state'
import { Button } from '#/components/ui/button'
import { getAllBookings, type BookingView } from '#/lib/api/booking'
import { getAllReservations, type ReservationView } from '#/lib/api/diningReservation'
import { getAllGuests, type GuestView } from '#/lib/api/guest'
import { getFacilities } from '#/lib/api/facility'
import { timeToMinutes, toDateKey } from '#/lib/booking-slots'
import type { Facility } from '#/lib/mock/types'

export const Route = createFileRoute('/staff/')({
  head: () => ({ meta: [{ title: 'Dashboard — StayFlow Staff' }] }),
  component: StaffDashboard,
})

function StaffDashboard() {
  const [bookings, setBookings] = React.useState<BookingView[]>([])
  const [reservations, setReservations] = React.useState<ReservationView[]>([])
  const [guests, setGuests] = React.useState<GuestView[]>([])
  const [facilities, setFacilities] = React.useState<Facility[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    Promise.all([getAllBookings(), getAllReservations(), getAllGuests(), getFacilities()])
      .then(([b, r, g, f]) => {
        if (!active) return
        setBookings(b)
        setReservations(r)
        setGuests(g)
        setFacilities(f)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => load(), [load])

  const today = toDateKey(new Date())

  const todaysGuests = guests.filter((g) => g.arrivalDate.slice(0, 10) === today)
  const todaysBookings = bookings.filter((b) => b.date.slice(0, 10) === today && b.status !== 'cancelled')
  const todaysDining = reservations.filter((d) => d.date.slice(0, 10) === today && d.status !== 'cancelled')
  const pendingCount =
    bookings.filter((b) => b.status === 'pending').length +
    guests.filter((g) => g.status === 'pending').length +
    reservations.filter((d) => d.status === 'pending').length

  const alerts = facilities.filter((f) => f.status !== 'open')

  const scheduleRows = [
    ...todaysBookings.map((b) => ({
      id: b.id,
      time: b.timeSlot,
      what: b.facilityName ?? 'Facility',
      who: b.residentName ?? '—',
      status: b.status,
    })),
    ...todaysDining.map((d) => ({
      id: d.id,
      time: d.time,
      what: d.restaurantName ?? 'Restaurant',
      who: d.residentName ?? '—',
      status: d.status,
    })),
    ...todaysGuests.map((g) => ({
      id: g.id,
      time: g.arrivalTime,
      what: `Guest: ${g.name}`,
      who: g.hostName ?? '—',
      status: g.status,
    })),
  ].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))

  const tasks = [
    ...bookings
      .filter((b) => b.status === 'pending')
      .map((b) => ({ id: b.id, label: `Approve ${b.facilityName ?? 'facility'} booking`, href: '/staff/bookings' })),
    ...guests
      .filter((g) => g.status === 'pending')
      .map((g) => ({ id: g.id, label: `Approve guest pass for ${g.name}`, href: '/staff/guests' })),
  ].slice(0, 6)

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 animate-fade-in">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-gold">Operations</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Today's Overview</h1>
      </div>

      {status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load today's overview right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : status === 'loading' ? (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
            ))}
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface lg:col-span-2" />
            <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />
          </div>
        </>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={Users} label="Visitors today" value={String(todaysGuests.length)} />
            <KpiCard icon={ClipboardList} label="Facility bookings" value={String(todaysBookings.length)} />
            <KpiCard icon={UtensilsCrossed} label="Dining reservations" value={String(todaysDining.length)} />
            <KpiCard icon={AlertTriangle} label="Pending approvals" value={String(pendingCount)} hint="Across bookings, dining & guests" />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionHeader title="Today's Schedule" description={`${scheduleRows.length} items`} />
              {scheduleRows.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Nothing scheduled today" />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
                      <tr>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">What</th>
                        <th className="px-4 py-3 font-medium">Who</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {scheduleRows.map((row) => (
                        <tr key={row.id}>
                          <td className="whitespace-nowrap px-4 py-3 text-foreground">{row.time}</td>
                          <td className="px-4 py-3 text-foreground">{row.what}</td>
                          <td className="px-4 py-3 text-muted-text">{row.who}</td>
                          <td className="px-4 py-3">
                            <StatusPill status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div>
                <SectionHeader title="Alerts" />
                {alerts.length === 0 ? (
                  <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-xs text-muted-text">
                    No facility alerts.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((f) => (
                      <div key={f.id} className="flex items-start gap-2.5 rounded-xl border border-accent-gold/25 bg-accent-gold/10 px-3.5 py-3">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-gold" />
                        <div>
                          <p className="text-xs font-medium text-foreground">{f.name}</p>
                          <p className="text-[11px] text-muted-text">{f.statusReason ?? f.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <SectionHeader title="Task List" />
                {tasks.length === 0 ? (
                  <p className="rounded-2xl border border-border bg-surface px-4 py-6 text-center text-xs text-muted-text">All caught up.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <Link
                        key={task.id}
                        to={task.href}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-3 text-xs text-foreground transition-colors hover:border-accent-indigo/40"
                      >
                        {task.label}
                        <StatusPill status="pending" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
