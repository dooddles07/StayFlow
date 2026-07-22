import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
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
const eventDate = (iso: string) => format(parseISO(iso), 'MMM d, yyyy')
const eventTimeRange = (event: CommunityEventView) => (event.endTime ? `${event.time} – ${event.endTime}` : event.time)

// Real community spaces (from the facilities list + past events), so staff pick a place
// instead of retyping it. "Other" reveals a free-text field for anything not listed.
const LOCATION_OPTIONS = [
  'Infinity Sky Pool',
  'Apex Fitness Studio',
  'Aurora Screening Room',
  'Championship Tennis Court',
  'Serenity Yoga Deck',
  'The Grand Function Room',
  'Serenity Spa & Sauna',
  'Junior Play Lounge',
  'Skyline Tower · Rooftop',
  "Koi & Copper · Private Room",
]
const OTHER_LOCATION = 'Other'

// Max size (before base64 inflates it ~33%) for a photo uploaded from a device. Photos are
// stored as data URIs directly in the database (no file storage service configured), so this
// keeps individual event rows reasonable rather than a hard technical ceiling.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

interface EventDraft {
  id?: string
  title: string
  category: EventCategory
  description: string
  image: string
  date: string
  time: string
  endTime: string
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
    endTime: '',
    location: '',
    capacity: 20,
  }
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

function ManagementEventsPage() {
  const [events, setEvents] = React.useState<CommunityEventView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [editing, setEditing] = React.useState<EventDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CommunityEventView | null>(null)
  const [saving, setSaving] = React.useState(false)
  const photoInputRef = React.useRef<HTMLInputElement>(null)
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
                    <p className="text-xs text-muted-text">{event.category} · {eventDate(event.date)} · {eventTimeRange(event)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-text">{event.attendeeIds.length}/{event.capacity}</span>
                </div>
                <div className="mt-3 flex justify-end gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-text hover:text-foreground"
                    aria-label={`Edit ${event.title}`}
                    onClick={() => setEditing({ ...event, date: event.date.slice(0, 10), endTime: event.endTime ?? '' })}
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
                    <td className="whitespace-nowrap px-4 py-3 text-muted-text">{eventDate(event.date)} · {eventTimeRange(event)}</td>
                    <td className="px-4 py-3 text-muted-text">{event.attendeeIds.length} / {event.capacity}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-text hover:text-foreground"
                          aria-label={`Edit ${event.title}`}
                          onClick={() => setEditing({ ...event, date: event.date.slice(0, 10), endTime: event.endTime ?? '' })}
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
                    placeholder="Paste a photo link, or upload one"
                    className="border-border bg-canvas"
                  />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      if (!file.type.startsWith('image/')) {
                        toast.error('Please choose an image file.')
                        return
                      }
                      if (file.size > MAX_PHOTO_BYTES) {
                        toast.error('That photo is too large — please use one under 2 MB.')
                        return
                      }
                      try {
                        const dataUrl = await readImageFile(file)
                        setEditing((prev) => (prev ? { ...prev, image: dataUrl } : prev))
                      } catch {
                        toast.error('Could not read that photo. Try a different file.')
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0 border-border"
                    aria-label="Upload a photo from your device"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="size-4" />
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-text/70">Paste a link above, or use the upload button to choose a photo from your phone or computer.</p>
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
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Date</Label>
                <Input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Start time</Label>
                  <Input value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} className="border-border bg-canvas" />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">
                    End time <span className="font-normal text-muted-text/70">· optional</span>
                  </Label>
                  <Input value={editing.endTime} onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} className="border-border bg-canvas" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Location</Label>
                <Select
                  value={LOCATION_OPTIONS.includes(editing.location) ? editing.location : OTHER_LOCATION}
                  onValueChange={(v) => setEditing({ ...editing, location: v === OTHER_LOCATION ? '' : v })}
                >
                  <SelectTrigger className="border-border bg-canvas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {LOCATION_OPTIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_LOCATION}>Other (type your own)</SelectItem>
                  </SelectContent>
                </Select>
                {!LOCATION_OPTIONS.includes(editing.location) && (
                  <Input
                    value={editing.location}
                    onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                    placeholder="Enter the location"
                    className="mt-2 border-border bg-canvas"
                  />
                )}
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
