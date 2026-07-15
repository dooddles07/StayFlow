import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Calendar, ClipboardList, Download, FileText, Users, UtensilsCrossed } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { Button } from '#/components/ui/button'
import { useMockStore } from '#/lib/store/mock-store'
import { exportToCsv } from '#/lib/export-csv'

export const Route = createFileRoute('/management/reports')({
  head: () => ({ meta: [{ title: 'Reports — StayFlow Management' }] }),
  component: ReportsPage,
})

interface ReportDef {
  id: string
  title: string
  description: string
  icon: LucideIcon
  buildRows: (state: ReturnType<typeof useMockStore>['state']) => Record<string, string | number>[]
}

const reports: ReportDef[] = [
  {
    id: 'bookings',
    title: 'Facility Bookings',
    description: 'All facility reservations with status and party size.',
    icon: ClipboardList,
    buildRows: (state) =>
      state.bookings.map((b) => ({
        date: b.date,
        facility: state.facilities.find((f) => f.id === b.facilityId)?.name ?? '',
        resident: state.residents.find((r) => r.id === b.residentId)?.name ?? '',
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
    buildRows: (state) =>
      state.diningReservations.map((d) => ({
        date: d.date,
        restaurant: state.restaurants.find((r) => r.id === d.restaurantId)?.name ?? '',
        resident: state.residents.find((r) => r.id === d.residentId)?.name ?? '',
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
    buildRows: (state) =>
      state.guests.map((g) => ({
        name: g.name,
        host: state.residents.find((r) => r.id === g.hostResidentId)?.name ?? '',
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
    buildRows: (state) =>
      state.residents.map((r) => ({
        name: r.name,
        unit: r.unit,
        tier: r.tier,
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
    buildRows: (state) =>
      state.events.map((e) => ({
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
  const { state } = useMockStore()

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Exports" title="Reports" description="Download operational reports as CSV or PDF." />

      <div className="space-y-3">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <div key={report.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-gold">
                  <Icon className="size-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{report.title}</p>
                  <p className="text-xs text-muted-text">{report.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-border text-foreground hover:bg-surface-hover"
                  onClick={() => toast.info('PDF export is coming in a future release')}
                >
                  <FileText className="size-3.5" />
                  PDF
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
                  onClick={() => {
                    exportToCsv(`stayflow-${report.id}.csv`, report.buildRows(state))
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
    </div>
  )
}
