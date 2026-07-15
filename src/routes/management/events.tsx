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
import { useMockStore, genId } from '#/lib/store/mock-store'
import type { CommunityEvent, EventCategory } from '#/lib/mock/types'

export const Route = createFileRoute('/management/events')({
  head: () => ({ meta: [{ title: 'Events — StayFlow Management' }] }),
  component: ManagementEventsPage,
})

const categories: EventCategory[] = ['Social', 'Wellness', 'Kids', 'Seasonal', 'Cultural']

function ManagementEventsPage() {
  const { state, dispatch } = useMockStore()
  const [editing, setEditing] = React.useState<CommunityEvent | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CommunityEvent | null>(null)

  function newEvent(): CommunityEvent {
    return {
      id: genId('evt'),
      title: '',
      category: 'Social',
      description: '',
      image: '/images/events/wine-tasting.jpg',
      date: new Date().toISOString().slice(0, 10),
      time: '6:00 PM',
      location: '',
      capacity: 20,
      attendeeIds: [],
    }
  }

  function save(event: CommunityEvent) {
    const exists = state.events.some((e) => e.id === event.id)
    dispatch({ type: exists ? 'UPDATE_EVENT' : 'ADD_EVENT', payload: event })
    setEditing(null)
    toast.success(exists ? 'Event updated' : 'Event created')
  }

  function confirmDelete() {
    if (!deleteTarget) return
    dispatch({ type: 'DELETE_EVENT', payload: { id: deleteTarget.id } })
    toast.success(`${deleteTarget.title} deleted`)
    setDeleteTarget(null)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Community"
        title="Events"
        description="Create and manage community events."
        actions={
          <Button className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setEditing(newEvent())}>
            <Plus className="size-4" /> Create Event
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-border">
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
            {state.events.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3 font-medium text-foreground">{event.title}</td>
                <td className="px-4 py-3 text-muted-text">{event.category}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-text">{event.date} · {event.time}</td>
                <td className="px-4 py-3 text-muted-text">{event.attendeeIds.length} / {event.capacity}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Button size="icon" variant="ghost" className="size-7 text-muted-text hover:text-foreground" onClick={() => setEditing(event)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7 text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteTarget(event)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{state.events.some((e) => e.id === editing?.id) ? 'Edit Event' : 'Create Event'}</SheetTitle>
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
                  <Input type="number" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) || 0 })} className="border-border bg-canvas" />
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
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => save(editing)}>
                Save Event
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
