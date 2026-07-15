import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import { Calendar, MapPin, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '#/components/stayflow/page-header'
import { Button } from '#/components/ui/button'
import { useMockStore } from '#/lib/store/mock-store'
import { CURRENT_RESIDENT_ID } from '#/lib/session'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/member/events')({
  head: () => ({ meta: [{ title: 'Events — StayFlow Member' }] }),
  component: EventsPage,
})

function EventsPage() {
  const { state, dispatch } = useMockStore()
  const events = [...state.events].sort((a, b) => a.date.localeCompare(b.date))

  function toggleRsvp(eventId: string, attending: boolean) {
    dispatch({ type: 'TOGGLE_EVENT_RSVP', payload: { eventId, residentId: CURRENT_RESIDENT_ID } })
    toast.success(attending ? 'RSVP cancelled' : "You're on the list!")
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Community" title="Events" description="RSVP to upcoming gatherings, wellness sessions, and celebrations." />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const attending = event.attendeeIds.includes(CURRENT_RESIDENT_ID)
          const spotsLeft = event.capacity - event.attendeeIds.length
          return (
            <div key={event.id} className="animate-fade-in flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
              <div
                className="relative h-36 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${event.image})`, backgroundColor: 'var(--color-surface-hover)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-canvas/60 px-2 py-1 text-[11px] font-medium text-accent-gold backdrop-blur">
                  {event.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-sm font-medium text-foreground">{event.title}</p>
                <p className="line-clamp-2 text-xs text-muted-text">{event.description}</p>
                <div className="mt-1 space-y-1 text-[11px] text-muted-text/80">
                  <p className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {format(parseISO(event.date), 'EEE, MMM d')} · {event.time}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {event.location}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Fully booked'}
                  </p>
                </div>
                <Button
                  onClick={() => toggleRsvp(event.id, attending)}
                  disabled={!attending && spotsLeft <= 0}
                  className={cn(
                    'mt-auto',
                    attending
                      ? 'bg-surface-hover text-foreground hover:bg-surface-hover/70'
                      : 'bg-accent-indigo text-white hover:bg-accent-indigo-soft',
                  )}
                >
                  {attending ? "You're Attending — Cancel" : 'RSVP'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
