import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '#/components/stayflow/page-header'
import { SectionHeader } from '#/components/stayflow/section-header'
import { UsageBar } from '#/components/stayflow/charts/usage-bar'
import { DonutStat } from '#/components/stayflow/charts/donut-stat'
import { AreaTrend } from '#/components/stayflow/charts/area-trend'
import { ChartTooltip } from '#/components/stayflow/charts/chart-tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Button } from '#/components/ui/button'
import {
  diningPopularTimes,
  diningTrend,
  facilityPeakHours,
  facilityUtilization,
  guestFrequent,
  guestTraffic,
  memberEngagement,
  memberGrowth,
} from '#/lib/live-analytics'
import { getAllBookings } from '#/lib/api/booking'
import { getAllGuests } from '#/lib/api/guest'
import { getAllResidents } from '#/lib/api/resident'
import { getFacilities } from '#/lib/api/facility'
import { getAllReservations } from '#/lib/api/diningReservation'

export const Route = createFileRoute('/management/analytics')({
  head: () => ({ meta: [{ title: 'Analytics — StayFlow Management' }] }),
  component: AnalyticsPage,
})

function CountBar({
  data,
  xKey,
  yKey,
  yLabel,
  summary,
  color,
}: {
  data: Record<string, string | number>[]
  xKey: string
  yKey: string
  yLabel: string
  summary: string
  color: string
}) {
  return (
    <div role="img" aria-label={summary} style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={{ fill: 'var(--color-muted-text)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--color-muted-text)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'var(--color-surface-hover)' }}
          />
          <Bar
            dataKey={yKey}
            name={yLabel}
            fill={color}
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function AnalyticsPage() {
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

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Deep-dive performance across facilities, dining, members, and guests."
      />

      {status === 'loading' || !data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">
            We couldn't load analytics right now.
          </p>
          <Button
            onClick={load}
            className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            Retry
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="facilities">
          <TabsList className="mb-6 bg-surface">
            <TabsTrigger
              value="facilities"
              className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold"
            >
              Facilities
            </TabsTrigger>
            <TabsTrigger
              value="dining"
              className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold"
            >
              Dining
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold"
            >
              Members
            </TabsTrigger>
            <TabsTrigger
              value="guests"
              className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold"
            >
              Guests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facilities" className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeader
                title="Most Popular Facilities"
                description="Utilization rate, trailing 30 days"
              />
              <UsageBar
                data={facilityUtilization(data.facilities, data.bookings)}
                summary="Facility utilization by amenity"
              />
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeader
                title="Peak Booking Hours"
                description="Bookings by time slot"
              />
              <CountBar
                data={facilityPeakHours(data.bookings)}
                xKey="hour"
                yKey="bookings"
                yLabel="Bookings"
                color="var(--color-accent-indigo)"
                summary="Facility bookings by time slot"
              />
            </div>
          </TabsContent>

          <TabsContent value="dining" className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeader
                title="Dining Reservations"
                description="Last six months"
              />
              <AreaTrend
                data={diningTrend(data.reservations)}
                xKey="month"
                yKey="reservations"
                yLabel="Reservations"
                color="gold"
                summary="Dining reservation volume, last six months"
              />
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeader
                title="Popular Reservation Times"
                description="Reservations by hour"
              />
              <CountBar
                data={diningPopularTimes(data.reservations)}
                xKey="time"
                yKey="reservations"
                yLabel="Reservations"
                color="var(--color-accent-gold)"
                summary="Dining reservations by hour"
              />
            </div>
          </TabsContent>

          <TabsContent value="members" className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
              <SectionHeader
                title="Member Growth"
                description="Active vs. new members by month"
              />
              <CountBar
                data={memberGrowth(data.residents)}
                xKey="month"
                yKey="active"
                yLabel="Active members"
                color="var(--color-accent-indigo)"
                summary="Active member count by month"
              />
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeader
                title="Member Engagement"
                description="How active members have been in the last 90 days"
              />
              <DonutStat
                data={memberEngagement(
                  data.residents,
                  data.bookings,
                  data.reservations,
                  data.guests,
                )}
                summary="Member engagement breakdown by activity level"
              />
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeader
                title="New Members"
                description="New sign-ups by month"
              />
              <CountBar
                data={memberGrowth(data.residents)}
                xKey="month"
                yKey="new"
                yLabel="New members"
                color="var(--color-accent-gold)"
                summary="New member sign-ups by month"
              />
            </div>
          </TabsContent>

          <TabsContent value="guests" className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeader title="Guest Traffic" description="This week" />
              <AreaTrend
                data={guestTraffic(data.guests)}
                xKey="day"
                yKey="guests"
                yLabel="Guests"
                color="indigo"
                summary="Guest traffic by day"
              />
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <SectionHeader
                title="Most Frequent Guests"
                description="Visits in the last 90 days"
              />
              <CountBar
                data={guestFrequent(data.guests)}
                xKey="name"
                yKey="visits"
                yLabel="Visits"
                color="var(--color-accent-gold)"
                summary="Most frequent guest visitors"
              />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
