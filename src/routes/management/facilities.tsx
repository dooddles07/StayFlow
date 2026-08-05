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
  createFacility,
  deleteFacility,
  getFacilities,
  updateFacility,
} from '#/lib/api/facility'
import type { Facility } from '#/lib/domain/types'
import { FacilityTable } from '#/components/stayflow/facilities/facility-table'
import { FacilityFormSheet } from '#/components/stayflow/facilities/facility-form-sheet'
import {
  DEFAULT_FACILITY_IMAGE,
  errText,
  newFacilityDraft,
} from '#/components/stayflow/facilities/facility-helpers'

export const Route = createFileRoute('/management/facilities')({
  head: () => ({ meta: [{ title: 'Facilities — StayFlow Management' }] }),
  component: ManagementFacilitiesPage,
})

function ManagementFacilitiesPage() {
  const [facilities, setFacilities] = React.useState<Facility[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
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
      const saved = editing.id
        ? await updateFacility(editing.id, payload)
        : await createFacility(payload)
      setFacilities((prev) => {
        const exists = prev.some((f) => f.id === saved.id)
        const next = exists
          ? prev.map((f) => (f.id === saved.id ? saved : f))
          : [...prev, saved]
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
          <Button
            className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
            onClick={() => setEditing(newFacilityDraft())}
          >
            <Plus className="size-4" /> Add Facility
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
            We couldn't load facilities right now.
          </p>
          <Button
            onClick={load}
            className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            Retry
          </Button>
        </div>
      ) : facilities.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-text">
          No facilities yet. Add your first community amenity.
        </div>
      ) : (
        <FacilityTable
          facilities={facilities}
          onEdit={setEditing}
          onDelete={setDeleteTarget}
        />
      )}

      <FacilityFormSheet
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
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-600"
              onClick={confirmDelete}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
