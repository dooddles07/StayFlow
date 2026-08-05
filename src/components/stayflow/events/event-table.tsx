import { Pencil, Trash2 } from 'lucide-react'
import { AnimatedTableRow } from '#/components/stayflow/animated-table-row'
import { Button } from '#/components/ui/button'
import type { CommunityEventView } from '#/lib/api/event'
import { eventDate, eventTimeRange } from './event-helpers'

interface EventTableProps {
  events: CommunityEventView[]
  onEdit: (event: CommunityEventView) => void
  onDelete: (event: CommunityEventView) => void
}

// Two renderings of the same rows (cards below sm, a table above) rather than one
// table squeezed into a phone width — the desktop columns don't have anywhere to
// go on a narrow screen.
export function EventTable({ events, onEdit, onDelete }: EventTableProps) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {event.title}
                </p>
                <p className="text-xs text-muted-text">
                  {event.category} · {eventDate(event.date)} ·{' '}
                  {eventTimeRange(event)}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-text">
                {event.attendeeIds.length}/{event.capacity}
              </span>
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-text hover:text-foreground"
                aria-label={`Edit ${event.title}`}
                onClick={() => onEdit(event)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-rose-400 hover:bg-rose-500/10"
                aria-label={`Delete ${event.title}`}
                onClick={() => onDelete(event)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
            <tr>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Attendees</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {events.map((event, i) => (
              <AnimatedTableRow key={event.id} index={i}>
                <td className="px-4 py-3 font-medium text-foreground">
                  {event.title}
                </td>
                <td className="px-4 py-3 text-muted-text">{event.category}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-text">
                  {eventDate(event.date)} · {eventTimeRange(event)}
                </td>
                <td className="px-4 py-3 text-muted-text">
                  {event.attendeeIds.length} / {event.capacity}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-text hover:text-foreground"
                      aria-label={`Edit ${event.title}`}
                      onClick={() => onEdit(event)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-rose-400 hover:bg-rose-500/10"
                      aria-label={`Delete ${event.title}`}
                      onClick={() => onDelete(event)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </AnimatedTableRow>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
