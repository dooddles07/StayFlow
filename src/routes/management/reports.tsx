import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from '#/lib/toast'
import {
  Calendar,
  ClipboardList,
  Download,
  FileText,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { Button } from '#/components/ui/button'
import { exportToCsv } from '#/lib/export-csv'
import { getAllBookings } from '#/lib/api/booking'
import { getAllReservations } from '#/lib/api/diningReservation'
import { getAllGuests } from '#/lib/api/guest'
import { getAllResidents, tierLabel } from '#/lib/api/resident'
import { getEvents } from '#/lib/api/event'

export const Route = createFileRoute('/management/reports')({
  head: () => ({ meta: [{ title: 'Reports — StayFlow Management' }] }),
  component: ReportsPage,
})

interface ReportData {
  bookings: Awaited<ReturnType<typeof getAllBookings>>
  reservations: Awaited<ReturnType<typeof getAllReservations>>
  guests: Awaited<ReturnType<typeof getAllGuests>>
  residents: Awaited<ReturnType<typeof getAllResidents>>
  events: Awaited<ReturnType<typeof getEvents>>
}

interface ReportDef {
  id: string
  title: string
  description: string
  icon: LucideIcon
  buildRows: (data: ReportData) => Record<string, string | number>[]
}

const reports: ReportDef[] = [
  {
    id: 'bookings',
    title: 'Facility Bookings',
    description: 'All facility reservations with status and party size.',
    icon: ClipboardList,
    buildRows: ({ bookings }) =>
      bookings.map((b) => ({
        date: b.date,
        facility: b.facilityName ?? '',
        resident: b.residentName ?? '',
        timeSlot: b.timeSlot,
        partySize: b.partySize,
        status: b.status,
      })),
  },
  {
    id: 'dining',
    title: 'Dining Reservations',
    description: 'Restaurant reservations across all venues.',
    icon: UtensilsCrossed,
    buildRows: ({ reservations }) =>
      reservations.map((d) => ({
        date: d.date,
        restaurant: d.restaurantName ?? '',
        resident: d.residentName ?? '',
        time: d.time,
        partySize: d.partySize,
        seating: d.seating,
        status: d.status,
      })),
  },
  {
    id: 'guests',
    title: 'Guest Traffic',
    description: 'Guest registrations, check-ins, and check-outs.',
    icon: Users,
    buildRows: ({ guests }) =>
      guests.map((g) => ({
        name: g.name,
        host: g.hostName ?? '',
        arrivalDate: g.arrivalDate,
        arrivalTime: g.arrivalTime,
        passNumber: g.passNumber,
        status: g.status,
      })),
  },
  {
    id: 'members',
    title: 'Member Directory',
    description: 'Full resident roster with unit and tier.',
    icon: FileText,
    buildRows: ({ residents }) =>
      residents.map((r) => ({
        name: r.name,
        unit: r.unit,
        tier: tierLabel(r.tier),
        email: r.email,
        phone: r.phone,
        moveInDate: r.moveInDate,
      })),
  },
  {
    id: 'events',
    title: 'Event Attendance',
    description: 'Community events with RSVP counts.',
    icon: Calendar,
    buildRows: ({ events }) =>
      events.map((e) => ({
        title: e.title,
        category: e.category,
        date: e.date,
        time: e.time,
        attendees: e.attendeeIds.length,
        capacity: e.capacity,
      })),
  },
]

function ReportsPage() {
  const [data, setData] = React.useState<ReportData | null>(null)
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    Promise.all([
      getAllBookings(),
      getAllReservations(),
      getAllGuests(),
      getAllResidents(),
      getEvents(),
    ])
      .then(([bookings, reservations, guests, residents, events]) => {
        if (!active) return
        setData({ bookings, reservations, guests, residents, events })
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Exports"
        title="Reports"
        description="Download operational reports as CSV or PDF."
      />

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : status === 'error' || !data ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">
            We couldn't load report data right now.
          </p>
          <Button
            onClick={load}
            className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const Icon = report.icon
            return (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-gold">
                    <Icon className="size-[18px]" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {report.title}
                    </p>
                    <p className="text-xs text-muted-text">
                      {report.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-border text-foreground hover:bg-surface-hover"
                    onClick={() =>
                      toast.info('PDF export is coming in a future release')
                    }
                  >
                    <FileText className="size-3.5" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
                    onClick={() => {
                      const rows = report.buildRows(data)
                      if (rows.length === 0) {
                        toast.info(
                          `No ${report.title.toLowerCase()} data to export`,
                        )
                        return
                      }
                      exportToCsv(`stayflow-${report.id}.csv`, rows)
                      toast.success(`${report.title} exported`)
                    }}
                  >
                    <Download className="size-3.5" />
                    CSV
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
