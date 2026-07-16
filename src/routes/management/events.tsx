import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { ApiError } from '#/lib/api/client'
import { createEvent, deleteEvent, getEvents, updateEvent, type CommunityEventView } from '#/lib/api/event'
import type { EventCategory } from '#/lib/mock/types'

export const Route = createFileRoute('/management/events')({
  head: () => ({ meta: [{ title: 'Events — StayFlow Management' }] }),
  component: ManagementEventsPage,
})

const categories: EventCategory[] = ['Social', 'Wellness', 'Kids', 'Seasonal', 'Cultural']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
const DEFAULT_EVENT_IMAGE = '/images/events/wine-tasting.webp'

interface EventDraft {
  id?: string
  title: string
  category: EventCategory
  description: string
  image: string
  date: string
  time: string
  location: string
  capacity: number
}

function newDraft(): EventDraft {
  return {
    title: '',
    category: 'Social',
    description: '',
    image: '',
    date: new Date().toISOString().slice(0, 10),
    time: '6:00 PM',
    location: '',
    capacity: 20,
  }
}

function ManagementEventsPage() {
  const [events, setEvents] = React.useState<CommunityEventView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [editing, setEditing] = React.useState<EventDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CommunityEventView | null>(null)
  const [saving, setSaving] = React.useState(false)

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
    if (!editing) return
    if (editing.title.trim() === '' || editing.description.trim() === '' || editing.location.trim() === '') {
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
        location: editing.location.trim(),
        capacity: editing.capacity,
      }
      const saved = editing.id ? await updateEvent(editing.id, payload) : await createEvent(payload)
      setEvents((prev) => {
        const exists = prev.some((e) => e.id === saved.id)
        const next = exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...prev]
        return next.sort((a, b) => a.date.localeCompare(b.date))
      })
      toast.success(editing.id ? 'Event updated' : 'Event created')
      setEditing(null)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteEvent(target.id)
      setEvents((prev) => prev.filter((e) => e.id !== target.id))
      toast.success(`${target.title} deleted`)
    } catch (err) {
      toast.error(errText(err))
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Community"
        title="Events"
        description="Create and manage community events."
        actions={
          <Button className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setEditing(newDraft())}>
            <Plus className="size-4" /> Create Event
          </Button>
        }
      />

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load events right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-text">
          No events yet. Create your first community event.
        </div>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    <p className="text-xs text-muted-text">{event.category} · {event.date} · {event.time}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-text">{event.attendeeIds.length}/{event.capacity}</span>
                </div>
                <div className="mt-3 flex justify-end gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-text hover:text-foreground"
                    aria-label={`Edit ${event.title}`}
                    onClick={() => setEditing({ ...event })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-rose-400 hover:bg-rose-500/10"
                    aria-label={`Delete ${event.title}`}
                    onClick={() => setDeleteTarget(event)}
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
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{event.title}</td>
                    <td className="px-4 py-3 text-muted-text">{event.category}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-text">{event.date} · {event.time}</td>
                    <td className="px-4 py-3 text-muted-text">{event.attendeeIds.length} / {event.capacity}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-text hover:text-foreground"
                          aria-label={`Edit ${event.title}`}
                          onClick={() => setEditing({ ...event })}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-rose-400 hover:bg-rose-500/10"
                          aria-label={`Delete ${event.title}`}
                          onClick={() => setDeleteTarget(event)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{editing?.id ? 'Edit Event' : 'Create Event'}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 px-4 pb-6">
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Description</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="border-border bg-canvas" rows={3} />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">
                  Event photo <span className="font-normal text-muted-text/70">· optional</span>
                </Label>
                <div className="flex items-center gap-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
                    <img
                      src={editing.image.trim() || DEFAULT_EVENT_IMAGE}
                      alt=""
                      className="size-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_EVENT_IMAGE
                      }}
                    />
                  </div>
                  <Input
                    value={editing.image}
                    onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                    placeholder="Paste a photo link, or leave blank for a default picture"
                    className="border-border bg-canvas"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as EventCategory })}>
                    <SelectTrigger className="border-border bg-canvas">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-surface text-foreground">
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Capacity</Label>
                  <Input type="number" min={1} value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) || 0 })} className="border-border bg-canvas" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Date</Label>
                  <Input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className="border-border bg-canvas" />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Time</Label>
                  <Input value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} className="border-border bg-canvas" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Location</Label>
                <Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className="border-border bg-canvas" />
              </div>
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save Event'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.title}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-500 text-white hover:bg-rose-600" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
