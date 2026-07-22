import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { StatusPill } from '#/components/stayflow/status-pill'
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
import { createFacility, deleteFacility, getFacilities, updateFacility } from '#/lib/api/facility'
import { clampPositiveInt } from '#/lib/booking-slots'
import type { Facility, FacilityCategory, FacilityStatus } from '#/lib/mock/types'

export const Route = createFileRoute('/management/facilities')({
  head: () => ({ meta: [{ title: 'Facilities — StayFlow Management' }] }),
  component: ManagementFacilitiesPage,
})

const categories: FacilityCategory[] = ['Wellness', 'Recreation', 'Entertainment', 'Sports', 'Function']
const statuses: FacilityStatus[] = ['open', 'maintenance', 'closed']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
const DEFAULT_FACILITY_IMAGE = '/images/facilities/pool.webp'

function newDraft(): Facility {
  return {
    id: '',
    name: '',
    category: 'Wellness',
    description: '',
    rules: [],
    image: '',
    capacity: 10,
    openHours: '9:00 AM – 9:00 PM',
    status: 'open',
    rating: 4.5,
    location: '',
  }
}

function ManagementFacilitiesPage() {
  const [facilities, setFacilities] = React.useState<Facility[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [editing, setEditing] = React.useState<Facility | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Facility | null>(null)
  const [saving, setSaving] = React.useState(false)
  // Mirror saving/delete-in-flight but checked/updated synchronously — two clicks
  // before React re-renders (and disables the button) would both read the same
  // stale state and both fire; a ref is always current.
  const savingRef = React.useRef(false)
  const deletingRef = React.useRef(false)

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    getFacilities()
      .then((rows) => {
        if (!active) return
        setFacilities(rows)
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
    if (editing.name.trim() === '' || editing.location.trim() === '') {
      toast.error('Name and location are required.')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const payload = {
        name: editing.name.trim(),
        category: editing.category,
        description: editing.description.trim(),
        rules: editing.rules,
        image: editing.image.trim() || DEFAULT_FACILITY_IMAGE,
        capacity: editing.capacity,
        openHours: editing.openHours.trim(),
        location: editing.location.trim(),
        rating: editing.rating,
        status: editing.status,
        statusReason: editing.statusReason,
      }
      const saved = editing.id ? await updateFacility(editing.id, payload) : await createFacility(payload)
      setFacilities((prev) => {
        const exists = prev.some((f) => f.id === saved.id)
        const next = exists ? prev.map((f) => (f.id === saved.id ? saved : f)) : [...prev, saved]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(editing.id ? 'Facility updated' : 'Facility added')
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
      await deleteFacility(target.id)
      setFacilities((prev) => prev.filter((f) => f.id !== target.id))
      toast.success(`${target.name} removed`)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      deletingRef.current = false
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Amenities"
        title="Facilities"
        description="Manage community amenities and their availability."
        actions={
          <Button className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setEditing(newDraft())}>
            <Plus className="size-4" /> Add Facility
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
          <p className="text-sm text-muted-text">We couldn't load facilities right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : facilities.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-text">
          No facilities yet. Add your first community amenity.
        </div>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {facilities.map((f) => (
              <div key={f.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-text">{f.category} · Capacity {f.capacity}</p>
                  </div>
                  <StatusPill status={f.status} />
                </div>
                <div className="mt-3 flex justify-end gap-1.5">
                  <Button size="icon" variant="ghost" className="size-7 text-muted-text hover:text-foreground" onClick={() => setEditing(f)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7 text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteTarget(f)}>
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
                  <th className="px-4 py-3 font-medium">Facility</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {facilities.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{f.name}</td>
                    <td className="px-4 py-3 text-muted-text">{f.category}</td>
                    <td className="px-4 py-3 text-muted-text">{f.capacity}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={f.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="icon" variant="ghost" className="size-7 text-muted-text hover:text-foreground" onClick={() => setEditing(f)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteTarget(f)}>
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
            <SheetTitle className="text-foreground">{editing?.id ? 'Edit Facility' : 'Add Facility'}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 px-4 pb-6">
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Description</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="border-border bg-canvas" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as FacilityCategory })}>
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
                  <Label className="mb-1.5 text-xs text-muted-text">Status</Label>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as FacilityStatus })}>
                    <SelectTrigger className="border-border bg-canvas">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-surface text-foreground">
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Capacity</Label>
                  <Input type="number" min={1} value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: clampPositiveInt(e.target.value, editing.capacity) })} className="border-border bg-canvas" />
                </div>
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Open hours</Label>
                  <Input value={editing.openHours} onChange={(e) => setEditing({ ...editing, openHours: e.target.value })} className="border-border bg-canvas" />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Location</Label>
                <Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className="border-border bg-canvas" />
              </div>
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" disabled={saving} onClick={save}>
                {saving ? 'Saving…' : 'Save Facility'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-500 text-white hover:bg-rose-600" onClick={confirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
