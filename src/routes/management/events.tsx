import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from '#/lib/toast'
import { Plus } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { Button } from '#/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import {
  createEvent,
  deleteEvent,
  getEvents,
  updateEvent,
} from '#/lib/api/event'
import type { CommunityEventView } from '#/lib/api/event'
import { EventTable } from '#/components/stayflow/events/event-table'
import { EventFormSheet } from '#/components/stayflow/events/event-form-sheet'
import {
  DEFAULT_EVENT_IMAGE,
  draftFromEvent,
  errText,
  newEventDraft,
} from '#/components/stayflow/events/event-helpers'
import type { EventDraft } from '#/components/stayflow/events/event-helpers'

export const Route = createFileRoute('/management/events')({
  head: () => ({ meta: [{ title: 'Events — StayFlow Management' }] }),
  component: ManagementEventsPage,
})

function ManagementEventsPage() {
  const [events, setEvents] = React.useState<CommunityEventView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [editing, setEditing] = React.useState<EventDraft | null>(null)
  const [deleteTarget, setDeleteTarget] =
    React.useState<CommunityEventView | null>(null)
  const [saving, setSaving] = React.useState(false)
  // Mirror saving/delete-in-flight but checked/updated synchronously — two clicks
  // before React re-renders (and disables the button) would both read the same
  // stale state and both fire; a ref is always current.
  const savingRef = React.useRef(false)
  const deletingRef = React.useRef(false)

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    getEvents()
      .then((data) => {
        if (!active) return
        setEvents(data)
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

  async function save() {
    if (!editing || savingRef.current) return
    if (
      editing.title.trim() === '' ||
      editing.description.trim() === '' ||
      editing.location.trim() === ''
    ) {
      toast.error('Title, description, and location are required.')
      return
    }
    if (editing.capacity < 1) {
      toast.error('Please allow room for at least 1 guest.')
      return
    }
    if (Number.isNaN(new Date(editing.date).getTime())) {
      toast.error('Please pick a valid date.')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const payload = {
        title: editing.title.trim(),
        category: editing.category,
        description: editing.description.trim(),
        image: editing.image.trim() || DEFAULT_EVENT_IMAGE,
        // The <input type="date"> value is a bare "YYYY-MM-DD"; the API's date column needs
        // a full ISO datetime, or Prisma rejects it with an unhandled validation error.
        date: new Date(editing.date).toISOString(),
        time: editing.time.trim(),
        endTime: editing.endTime.trim() || null,
        location: editing.location.trim(),
        capacity: editing.capacity,
      }
      const saved = editing.id
        ? await updateEvent(editing.id, payload)
        : await createEvent(payload)
      setEvents((prev) => {
        const exists = prev.some((e) => e.id === saved.id)
        const next = exists
          ? prev.map((e) => (e.id === saved.id ? saved : e))
          : [saved, ...prev]
        return next.sort((a, b) => a.date.localeCompare(b.date))
      })
      toast.success(editing.id ? 'Event updated' : 'Event created')
      setEditing(null)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deletingRef.current) return
    deletingRef.current = true
    const target = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteEvent(target.id)
      setEvents((prev) => prev.filter((e) => e.id !== target.id))
      toast.success(`${target.title} deleted`)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      deletingRef.current = false
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Community"
        title="Events"
        description="Create and manage community events."
        actions={
          <Button
            className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
            onClick={() => setEditing(newEventDraft())}
          >
            <Plus className="size-4" /> Create Event
          </Button>
        }
      />

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">
            We couldn't load events right now.
          </p>
          <Button
            onClick={load}
            className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            Retry
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-text">
          No events yet. Create your first community event.
        </div>
      ) : (
        <EventTable
          events={events}
          onEdit={(event) => setEditing(draftFromEvent(event))}
          onDelete={setDeleteTarget}
        />
      )}

      <EventFormSheet
        editing={editing}
        saving={saving}
        onChange={setEditing}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.title}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-600"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
