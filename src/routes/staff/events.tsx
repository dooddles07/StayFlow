import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import * as React from 'react'
import { CalendarDays, Users } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { EmptyState } from '#/components/stayflow/empty-state'
import { AvatarInitials } from '#/components/stayflow/avatar-initials'
import { Button } from '#/components/ui/button'
import { getEvents, type CommunityEventView } from '#/lib/api/event'
import { getAllResidents } from '#/lib/api/resident'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/staff/events')({
  head: () => ({ meta: [{ title: 'Events — StayFlow Staff' }] }),
  component: StaffEventsPage,
})

// Attendee list only ever renders name + unit — narrowed down from the full resident
// directory response (email, phone, emergency contacts, family, vehicles...) right
// after fetch so that PII never lingers in this page's state for no reason.
interface AttendeeResident {
  id: string
  name: string
  unit: string
}

function StaffEventsPage() {
  const [events, setEvents] = React.useState<CommunityEventView[]>([])
  const [residents, setResidents] = React.useState<AttendeeResident[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [selectedId, setSelectedId] = React.useState<string | undefined>(undefined)

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    Promise.all([getEvents(), getAllResidents()])
      .then(([e, r]) => {
        if (!active) return
        setEvents(e)
        setResidents(r.map((p) => ({ id: p.id, name: p.name, unit: p.unit })))
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

  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))
  const selected = sorted.find((e) => e.id === selectedId) ?? sorted[0]
  const residentById = new Map(residents.map((r) => [r.id, r]))
  const attendees = selected ? selected.attendeeIds.map((id) => residentById.get(id)).filter((r): r is AttendeeResident => !!r) : []

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Community" title="Events" description="Review attendee lists for upcoming events." />

      {status === 'loading' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface lg:col-span-2" />
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load events right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming events" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            {sorted.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedId(event.id)}
                className={cn(
                  'w-full rounded-xl border px-4 py-3 text-left transition-colors',
                  selected?.id === event.id ? 'border-accent-gold bg-accent-indigo/10' : 'border-border bg-surface hover:border-accent-indigo/30',
                )}
              >
                <p className="text-sm font-medium text-foreground">{event.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-text">
                  <CalendarDays className="size-3.5" />
                  {format(parseISO(event.date), 'EEE, MMM d')} · {event.time}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-text/70">{event.attendeeIds.length} / {event.capacity} attending</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {!selected ? (
              <EmptyState icon={Users} title="No event selected" />
            ) : attendees.length === 0 ? (
              <EmptyState icon={Users} title="No attendees yet" description="No one has saved a spot for this event." />
            ) : (
              <div className="rounded-2xl border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{selected.title} — Attendees</p>
                </div>
                <ul className="divide-y divide-border">
                  {attendees.map((resident) => (
                    <li key={resident.id} className="flex items-center gap-3 px-4 py-3">
                      <AvatarInitials seed={resident.name} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{resident.name}</p>
                        <p className="text-xs text-muted-text">{resident.unit}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
