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
import { tables as allTables } from '#/lib/mock/tables'
import type { Restaurant } from '#/lib/mock/types'

export const Route = createFileRoute('/management/restaurants')({
  head: () => ({ meta: [{ title: 'Restaurants — StayFlow Management' }] }),
  component: RestaurantsPage,
})

const priceRanges: Restaurant['priceRange'][] = ['$', '$$', '$$$', '$$$$']

function RestaurantsPage() {
  const { state, dispatch } = useMockStore()
  const [editing, setEditing] = React.useState<Restaurant | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Restaurant | null>(null)

  function newRestaurant(): Restaurant {
    return {
      id: genId('rst'),
      name: '',
      cuisine: '',
      description: '',
      image: '/images/restaurants/ember-oak.jpg',
      openHours: '11:00 AM – 10:00 PM',
      priceRange: '$$$',
      rating: 4.5,
      location: '',
    }
  }

  function save(restaurant: Restaurant) {
    const exists = state.restaurants.some((r) => r.id === restaurant.id)
    dispatch({ type: exists ? 'UPDATE_RESTAURANT' : 'ADD_RESTAURANT', payload: restaurant })
    setEditing(null)
    toast.success(exists ? 'Restaurant updated' : 'Restaurant added')
  }

  function confirmDelete() {
    if (!deleteTarget) return
    dispatch({ type: 'DELETE_RESTAURANT', payload: { id: deleteTarget.id } })
    toast.success(`${deleteTarget.name} removed`)
    setDeleteTarget(null)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Culinary"
        title="Restaurants"
        description="Manage dining venues, tables, and menus."
        actions={
          <Button className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setEditing(newRestaurant())}>
            <Plus className="size-4" /> Add Restaurant
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {state.restaurants.map((restaurant) => {
          const tableCount = allTables.filter((t) => t.restaurantId === restaurant.id).length
          return (
            <div key={restaurant.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{restaurant.name}</p>
                  <p className="text-xs text-muted-text">{restaurant.cuisine}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="icon" variant="ghost" className="size-7 text-muted-text hover:text-foreground" onClick={() => setEditing(restaurant)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7 text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteTarget(restaurant)}>
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

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{state.restaurants.some((r) => r.id === editing?.id) ? 'Edit Restaurant' : 'Add Restaurant'}</SheetTitle>
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
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => save(editing)}>
                Save Restaurant
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
