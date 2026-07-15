import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Building2, CalendarCheck, ClipboardList, DollarSign, UserCheck, Users } from 'lucide-react'
import { KpiCard } from '#/components/stayflow/kpi-card'
import { SectionHeader } from '#/components/stayflow/section-header'
import { UsageBar } from '#/components/stayflow/charts/usage-bar'
import { RevenueLine } from '#/components/stayflow/charts/revenue-line'
import { DonutStat } from '#/components/stayflow/charts/donut-stat'
import { AreaTrend } from '#/components/stayflow/charts/area-trend'
import { analytics } from '#/lib/mock/analytics'
import { useMockStore } from '#/lib/store/mock-store'
import { toDateKey } from '#/lib/booking-slots'

export const Route = createFileRoute('/management/')({
  head: () => ({ meta: [{ title: 'Dashboard — StayFlow Management' }] }),
  component: ManagementDashboard,
})

function ManagementDashboard() {
  const { state } = useMockStore()
  const today = toDateKey(new Date())

  const totalMembers = state.residents.length
  const activeBookingsToday = state.bookings.filter((b) => b.date === today && b.status !== 'cancelled').length
  const monthlyRevenue = analytics.diningRevenue[analytics.diningRevenue.length - 1]?.revenue ?? 0
  const guestsToday = state.guests.filter((g) => g.arrivalDate === today).length
  const avgUtilization = Math.round(
    analytics.facilityUtilization.reduce((sum, f) => sum + f.utilization, 0) / analytics.facilityUtilization.length,
  )
  const pendingApprovals =
    state.bookings.filter((b) => b.status === 'pending').length +
    state.guests.filter((g) => g.status === 'pending').length +
    state.diningReservations.filter((d) => d.status === 'pending').length

  const alerts = state.facilities.filter((f) => f.status !== 'open')

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 animate-fade-in">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-gold">Executive Overview</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Community Dashboard</h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Users} label="Total members" value={String(totalMembers)} delta={{ value: '+4.7%', positive: true }} />
        <KpiCard icon={ClipboardList} label="Bookings today" value={String(activeBookingsToday)} />
        <KpiCard icon={DollarSign} label="Dining revenue (MTD)" value={`$${(monthlyRevenue / 1000).toFixed(1)}k`} delta={{ value: '+7.4%', positive: true }} />
        <KpiCard icon={UserCheck} label="Guests today" value={String(guestsToday)} />
        <KpiCard icon={Building2} label="Avg. utilization" value={`${avgUtilization}%`} delta={{ value: '+2.1%', positive: true }} />
        <KpiCard icon={CalendarCheck} label="Pending approvals" value={String(pendingApprovals)} />
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {alerts.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-full border border-accent-gold/30 bg-accent-gold/10 px-3 py-1.5 text-xs text-accent-gold">
              <AlertTriangle className="size-3.5" />
              {f.name} — {f.statusReason ?? f.status}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeader title="Facility Utilization" description="Booking rate by amenity" />
          <UsageBar data={analytics.facilityUtilization} summary="Facility utilization percentages across all amenities" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeader title="Dining Revenue" description="Last six months" />
          <RevenueLine data={analytics.diningRevenue} summary="Monthly dining revenue trend, increasing over the last six months" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeader title="Member Engagement" description="Activity segmentation" />
          <DonutStat data={analytics.memberEngagement} summary="Breakdown of member engagement levels" centerLabel="Members" centerValue={String(totalMembers)} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <SectionHeader title="Guest Traffic" description="This week" />
          <AreaTrend
            data={analytics.guestTraffic}
            xKey="day"
            yKey="guests"
            yLabel="Guests"
            color="indigo"
            summary="Guest traffic by day of week, peaking on weekends"
          />
        </div>
      </div>
    </div>
  )
}
