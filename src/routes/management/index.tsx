import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  ClipboardList,
  UserCheck,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { KpiCard } from '#/components/stayflow/kpi-card'
import { SectionHeader } from '#/components/stayflow/section-header'
import { UsageBar } from '#/components/stayflow/charts/usage-bar'
import { DonutStat } from '#/components/stayflow/charts/donut-stat'
import { AreaTrend } from '#/components/stayflow/charts/area-trend'
import { Button } from '#/components/ui/button'
import {
  diningTrend,
  facilityUtilization,
  guestTraffic,
  memberEngagement,
} from '#/lib/live-analytics'
import { getAllBookings } from '#/lib/api/booking'
import { getAllGuests } from '#/lib/api/guest'
import { getAllResidents } from '#/lib/api/resident'
import { getFacilities } from '#/lib/api/facility'
import { toDateKey } from '#/lib/booking-slots'
import { getAllReservations } from '#/lib/api/diningReservation'

export const Route = createFileRoute('/management/')({
  head: () => ({ meta: [{ title: 'Dashboard — StayFlow Management' }] }),
  component: ManagementDashboard,
})

function ManagementDashboard() {
  const [data, setData] = React.useState<{
    residents: Awaited<ReturnType<typeof getAllResidents>>
    bookings: Awaited<ReturnType<typeof getAllBookings>>
    guests: Awaited<ReturnType<typeof getAllGuests>>
    facilities: Awaited<ReturnType<typeof getFacilities>>
    reservations: Awaited<ReturnType<typeof getAllReservations>>
  } | null>(null)
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    Promise.all([
      getAllResidents(),
      getAllBookings(),
      getAllGuests(),
      getFacilities(),
      getAllReservations(),
    ])
      .then(([residents, bookings, guests, facilities, reservations]) => {
        if (!active) return
        setData({ residents, bookings, guests, facilities, reservations })
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

  if (status === 'loading' || !data) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">
            We couldn't load the dashboard right now.
          </p>
          <Button
            onClick={load}
            className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { residents, bookings, guests, facilities, reservations } = data
  const today = toDateKey(new Date())

  const totalMembers = residents.length
  const activeBookingsToday = bookings.filter(
    (b) => toDateKey(new Date(b.date)) === today && b.status !== 'cancelled',
  ).length
  const guestsToday = guests.filter(
    (g) => toDateKey(new Date(g.arrivalDate)) === today,
  ).length
  const pendingApprovals =
    bookings.filter((b) => b.status === 'pending').length +
    guests.filter((g) => g.status === 'pending').length +
    reservations.filter((r) => r.status === 'pending').length

  const utilization = facilityUtilization(facilities, bookings)
  const avgUtilization = utilization.length
    ? Math.round(
        utilization.reduce((sum, f) => sum + f.utilization, 0) /
          utilization.length,
      )
    : 0
  const traffic = guestTraffic(guests)

  const diningByMonth = diningTrend(reservations)
  const monthlyReservations =
    diningByMonth[diningByMonth.length - 1]?.reservations ?? 0
  const engagement = memberEngagement(residents, bookings, reservations, guests)

  const alerts = facilities.filter((f) => f.status !== 'open')

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 animate-fade-in">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-gold">
          Executive Overview
        </p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Community Dashboard
        </h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={Users}
          label="Total members"
          value={String(totalMembers)}
        />
        <KpiCard
          icon={ClipboardList}
          label="Bookings today"
          value={String(activeBookingsToday)}
        />
        <KpiCard
          icon={UtensilsCrossed}
          label="Dining reservations this month"
          value={String(monthlyReservations)}
        />
        <KpiCard
          icon={UserCheck}
          label="Guests today"
          value={String(guestsToday)}
        />
        <KpiCard
          icon={Building2}
          label="Avg. utilization"
          value={`${avgUtilization}%`}
        />
        <KpiCard
          icon={CalendarCheck}
          label="Pending approvals"
          value={String(pendingApprovals)}
        />
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {alerts.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-full border border-accent-gold/30 bg-accent-gold/10 px-3 py-1.5 text-xs text-accent-gold"
            >
              <AlertTriangle className="size-3.5" />
              {f.name} — {f.statusReason ?? f.status}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeader
            title="Facility Utilization"
            description="Booking rate by amenity, trailing 30 days"
          />
          <UsageBar
            data={utilization}
            summary="Facility utilization percentages across all amenities"
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeader
            title="Dining Reservations"
            description="Last six months"
          />
          <AreaTrend
            data={diningByMonth}
            xKey="month"
            yKey="reservations"
            yLabel="Reservations"
            color="gold"
            summary="Dining reservation volume, last six months"
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeader
            title="Member Engagement"
            description="How active members have been in the last 90 days"
          />
          <DonutStat
            data={engagement}
            summary="Member engagement breakdown by activity level"
            centerLabel="Members"
            centerValue={String(totalMembers)}
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeader title="Guest Traffic" description="This week" />
          <AreaTrend
            data={traffic}
            xKey="day"
            yKey="guests"
            yLabel="Guests"
            color="indigo"
            summary="Guest traffic by day of week"
          />
        </div>
      </div>
    </div>
  )
}
