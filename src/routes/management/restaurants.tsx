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
import { createRestaurant, deleteRestaurant, getRestaurants, updateRestaurant } from '#/lib/api/restaurant'
import { getAllTables } from '#/lib/api/table'
import type { DiningTable, Restaurant } from '#/lib/mock/types'

export const Route = createFileRoute('/management/restaurants')({
  head: () => ({ meta: [{ title: 'Restaurants — StayFlow Management' }] }),
  component: RestaurantsPage,
})

const priceRanges: Restaurant['priceRange'][] = ['$', '$$', '$$$', '$$$$']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
const DEFAULT_RESTAURANT_IMAGE = '/images/restaurants/ember-oak.webp'

function newDraft(): Restaurant {
  return {
    id: '',
    name: '',
    cuisine: '',
    description: '',
    image: '',
    openHours: '11:00 AM – 10:00 PM',
    priceRange: '$$$',
    rating: 4.5,
    location: '',
  }
}

function RestaurantsPage() {
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([])
  const [tables, setTables] = React.useState<DiningTable[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [editing, setEditing] = React.useState<Restaurant | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Restaurant | null>(null)
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    Promise.all([getRestaurants(), getAllTables()])
      .then(([r, t]) => {
        if (!active) return
        setRestaurants(r)
        setTables(t)
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
    if (editing.name.trim() === '' || editing.cuisine.trim() === '' || editing.location.trim() === '') {
      toast.error('Name, cuisine, and location are required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: editing.name.trim(),
        cuisine: editing.cuisine.trim(),
        description: editing.description.trim(),
        image: editing.image.trim() || DEFAULT_RESTAURANT_IMAGE,
        openHours: editing.openHours.trim(),
        priceRange: editing.priceRange,
        rating: editing.rating,
        location: editing.location.trim(),
      }
      const saved = editing.id ? await updateRestaurant(editing.id, payload) : await createRestaurant(payload)
      setRestaurants((prev) => {
        const exists = prev.some((r) => r.id === saved.id)
        const next = exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(editing.id ? 'Restaurant updated' : 'Restaurant added')
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
      await deleteRestaurant(target.id)
      setRestaurants((prev) => prev.filter((r) => r.id !== target.id))
      toast.success(`${target.name} removed`)
    } catch (err) {
      toast.error(errText(err))
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Culinary"
        title="Restaurants"
        description="Manage dining venues, tables, and menus."
        actions={
          <Button className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setEditing(newDraft())}>
            <Plus className="size-4" /> Add Restaurant
          </Button>
        }
      />

      {status === 'loading' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load restaurants right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : restaurants.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-text">
          No restaurants yet. Add your first dining venue.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {restaurants.map((restaurant) => {
            const tableCount = tables.filter((t) => t.restaurantId === restaurant.id).length
            return (
              <div key={restaurant.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{restaurant.name}</p>
                    <p className="text-xs text-muted-text">{restaurant.cuisine}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-text hover:text-foreground"
                      aria-label={`Edit ${restaurant.name}`}
                      onClick={() => setEditing(restaurant)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-rose-400 hover:bg-rose-500/10"
                      aria-label={`Remove ${restaurant.name}`}
                      onClick={() => setDeleteTarget(restaurant)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-text">
                  <span>{restaurant.priceRange}</span>
                  <span>{restaurant.openHours}</span>
                  <span>{tableCount} tables</span>
                  <span>★ {restaurant.rating}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{editing?.id ? 'Edit Restaurant' : 'Add Restaurant'}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 px-4 pb-6">
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Cuisine</Label>
                <Input value={editing.cuisine} onChange={(e) => setEditing({ ...editing, cuisine: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Description</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="border-border bg-canvas" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-xs text-muted-text">Price range</Label>
                  <Select value={editing.priceRange} onValueChange={(v) => setEditing({ ...editing, priceRange: v as Restaurant['priceRange'] })}>
                    <SelectTrigger className="border-border bg-canvas">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-surface text-foreground">
                      {priceRanges.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                {saving ? 'Saving…' : 'Save Restaurant'}
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
