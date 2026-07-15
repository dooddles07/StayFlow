import { createFileRoute } from '@tanstack/react-router'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '#/components/stayflow/page-header'
import { SectionHeader } from '#/components/stayflow/section-header'
import { UsageBar } from '#/components/stayflow/charts/usage-bar'
import { RevenueLine } from '#/components/stayflow/charts/revenue-line'
import { DonutStat } from '#/components/stayflow/charts/donut-stat'
import { AreaTrend } from '#/components/stayflow/charts/area-trend'
import { ChartTooltip } from '#/components/stayflow/charts/chart-tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { analytics } from '#/lib/mock/analytics'

export const Route = createFileRoute('/management/analytics')({
  head: () => ({ meta: [{ title: 'Analytics — StayFlow Management' }] }),
  component: AnalyticsPage,
})

function CountBar({ data, xKey, yKey, yLabel, summary, color }: { data: Record<string, string | number>[]; xKey: string; yKey: string; yLabel: string; summary: string; color: string }) {
  return (
    <div role="img" aria-label={summary} style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: 'var(--color-muted-text)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
          <YAxis tick={{ fill: 'var(--color-muted-text)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-hover)' }} />
          <Bar dataKey={yKey} name={yLabel} fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Insights" title="Analytics" description="Deep-dive performance across facilities, dining, members, and guests." />

      <Tabs defaultValue="facilities">
        <TabsList className="mb-6 bg-surface">
          <TabsTrigger value="facilities" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Facilities
          </TabsTrigger>
          <TabsTrigger value="dining" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Dining
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Members
          </TabsTrigger>
          <TabsTrigger value="guests" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Guests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="facilities" className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader title="Most Popular Facilities" description="Utilization rate" />
            <UsageBar data={analytics.facilityUtilization} summary="Facility utilization by amenity" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader title="Peak Booking Hours" description="Bookings by time of day" />
            <CountBar data={analytics.facilityPeakHours} xKey="hour" yKey="bookings" yLabel="Bookings" color="var(--color-accent-indigo)" summary="Facility bookings peak in the evening" />
          </div>
        </TabsContent>

        <TabsContent value="dining" className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader title="Dining Revenue" description="Last six months" />
            <RevenueLine data={analytics.diningRevenue} summary="Dining revenue trend over six months" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader title="Popular Reservation Times" description="Reservations by time slot" />
            <CountBar data={analytics.diningPopularTimes} xKey="time" yKey="reservations" yLabel="Reservations" color="var(--color-accent-gold)" summary="Dining reservations peak around 8pm" />
          </div>
        </TabsContent>

        <TabsContent value="members" className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
            <SectionHeader title="Member Growth" description="Active vs. new members by month" />
            <CountBar data={analytics.memberGrowth} xKey="month" yKey="active" yLabel="Active members" color="var(--color-accent-indigo)" summary="Active member count trending upward" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader title="Engagement Segmentation" />
            <DonutStat data={analytics.memberEngagement} summary="Member engagement breakdown by activity level" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader title="New Members" description="New sign-ups by month" />
            <CountBar data={analytics.memberGrowth} xKey="month" yKey="new" yLabel="New members" color="var(--color-accent-gold)" summary="New member sign-ups by month" />
          </div>
        </TabsContent>

        <TabsContent value="guests" className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader title="Guest Traffic" description="This week" />
            <AreaTrend data={analytics.guestTraffic} xKey="day" yKey="guests" yLabel="Guests" color="indigo" summary="Guest traffic by day, peaking on weekends" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <SectionHeader title="Most Frequent Guests" description="Visits this quarter" />
            <CountBar data={analytics.guestFrequent} xKey="name" yKey="visits" yLabel="Visits" color="var(--color-accent-gold)" summary="Most frequent guest visitors" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
