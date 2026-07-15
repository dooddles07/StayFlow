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
import { useMockStore, genId } from '#/lib/store/mock-store'
import type { Facility, FacilityCategory, FacilityStatus } from '#/lib/mock/types'

export const Route = createFileRoute('/management/facilities')({
  head: () => ({ meta: [{ title: 'Facilities — StayFlow Management' }] }),
  component: ManagementFacilitiesPage,
})

const categories: FacilityCategory[] = ['Wellness', 'Recreation', 'Entertainment', 'Sports', 'Function']
const statuses: FacilityStatus[] = ['open', 'maintenance', 'closed']

function ManagementFacilitiesPage() {
  const { state, dispatch } = useMockStore()
  const [editing, setEditing] = React.useState<Facility | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Facility | null>(null)

  function newFacility(): Facility {
    return {
      id: genId('fac'),
      name: '',
      category: 'Wellness',
      description: '',
      rules: [],
      image: '/images/facilities/pool.jpg',
      capacity: 10,
      openHours: '9:00 AM – 9:00 PM',
      status: 'open',
      rating: 4.5,
      location: '',
    }
  }

  function save(facility: Facility) {
    const exists = state.facilities.some((f) => f.id === facility.id)
    dispatch({ type: exists ? 'UPDATE_FACILITY' : 'ADD_FACILITY', payload: facility })
    setEditing(null)
    toast.success(exists ? 'Facility updated' : 'Facility added')
  }

  function confirmDelete() {
    if (!deleteTarget) return
    dispatch({ type: 'DELETE_FACILITY', payload: { id: deleteTarget.id } })
    toast.success(`${deleteTarget.name} removed`)
    setDeleteTarget(null)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Amenities"
        title="Facilities"
        description="Manage community amenities and their availability."
        actions={
          <Button className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setEditing(newFacility())}>
            <Plus className="size-4" /> Add Facility
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-2xl border border-border">
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
            {state.facilities.map((f) => (
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

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{state.facilities.some((f) => f.id === editing?.id) ? 'Edit Facility' : 'Add Facility'}</SheetTitle>
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
                  <Input type="number" value={editing.capacity} onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) || 0 })} className="border-border bg-canvas" />
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
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => save(editing)}>
                Save Facility
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
