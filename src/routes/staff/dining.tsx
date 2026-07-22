import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Search, UtensilsCrossed, X } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { SectionHeader } from '#/components/stayflow/section-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { EmptyState } from '#/components/stayflow/empty-state'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import { ApiError } from '#/lib/api/client'
import { getRestaurants } from '#/lib/api/restaurant'
import { getAllTables } from '#/lib/api/table'
import { getAllReservations, setReservationStatus, type ReservationView } from '#/lib/api/diningReservation'
import { timeToMinutes } from '#/lib/booking-slots'
import { cn } from '#/lib/utils'
import type { DiningTable, Restaurant } from '#/lib/mock/types'

export const Route = createFileRoute('/staff/dining')({
  head: () => ({ meta: [{ title: 'Dining — StayFlow Staff' }] }),
  component: StaffDiningPage,
})

const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

const tableStatusClasses: Record<DiningTable['status'], string> = {
  available: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  reserved: 'border-accent-gold/30 bg-accent-gold/10 text-accent-gold',
  occupied: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
}

function DeclineButton({ reservation, busy, onConfirm }: { reservation: ReservationView; busy: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={busy} className="gap-1.5 border-border text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-400">
          <X className="size-3.5" /> Decline
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border bg-surface">
        <AlertDialogHeader>
          <AlertDialogTitle>Decline this reservation?</AlertDialogTitle>
          <AlertDialogDescription>
            {reservation.residentName ?? 'This resident'}'s table for {reservation.date.slice(0, 10)} at {reservation.time} will be released. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border">Keep it</AlertDialogCancel>
          <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>
            Decline Reservation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function StaffDiningPage() {
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([])
  const [tables, setTables] = React.useState<DiningTable[]>([])
  const [reservations, setReservations] = React.useState<ReservationView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [tab, setTab] = React.useState<'tables' | 'reservations'>('tables')
  const [busyIds, setBusyIds] = React.useState<Set<string>>(new Set())
  // Mirrors busyIds but checked/updated synchronously — two clicks before React
  // re-renders (and disables the button) would both read the same stale busyIds state
  // and pass the guard; a ref is always current.
  const busyRef = React.useRef<Set<string>>(new Set())
  const [query, setQuery] = React.useState('')

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    Promise.all([getRestaurants(), getAllTables(), getAllReservations()])
      .then(([r, t, res]) => {
        if (!active) return
        setRestaurants(r)
        setTables(t)
        setReservations(res)
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

  async function updateStatus(id: string, next: ReservationView['status'], successMessage: string) {
    if (busyRef.current.has(id)) return
    busyRef.current.add(id)
    setBusyIds(new Set(busyRef.current))
    try {
      const updated = await setReservationStatus(id, next)
      setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)))
      // Confirming/arriving/declining all change a table's status server-side (assign,
      // occupy, or release) — refresh Table Map too, or it silently goes stale until a
      // full page reload. Best-effort: a failed refresh shouldn't fail the action itself.
      getAllTables().then(setTables).catch(() => {})
      toast.success(successMessage)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      busyRef.current.delete(id)
      setBusyIds(new Set(busyRef.current))
    }
  }

  const confirmReservation = (id: string) => updateStatus(id, 'confirmed', 'Reservation confirmed')
  const confirmArrival = (id: string) => updateStatus(id, 'arrived', 'Arrival confirmed')
  const declineReservation = (id: string) => updateStatus(id, 'cancelled', 'Reservation declined')

  const q = query.trim().toLowerCase()
  const sortedReservations = [...reservations]
    .filter((r) => q === '' || (r.restaurantName ?? '').toLowerCase().includes(q) || (r.residentName ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.time) - timeToMinutes(b.time))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Culinary Operations" title="Dining" description="Monitor table status and manage reservation arrivals." />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
        <TabsList className="bg-surface">
          <TabsTrigger value="tables" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Table Map
          </TabsTrigger>
          <TabsTrigger value="reservations" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Reservations
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'reservations' && status === 'ready' && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by restaurant or resident…"
            aria-label="Search reservations"
            className="border-border bg-surface pl-9"
          />
        </div>
      )}

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load dining data right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : tab === 'tables' ? (
        <div className="space-y-8">
          {restaurants.map((restaurant) => {
            const restaurantTables = tables.filter((t) => t.restaurantId === restaurant.id)
            return (
              <div key={restaurant.id}>
                <SectionHeader title={restaurant.name} description={`${restaurantTables.length} tables`} />
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {restaurantTables.map((table) => (
                    <div
                      key={table.id}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 rounded-xl border p-4 text-center',
                        tableStatusClasses[table.status],
                      )}
                    >
                      <p className="text-sm font-semibold">{table.label}</p>
                      <p className="text-[11px] capitalize opacity-80">{table.status}</p>
                      <p className="text-[10px] opacity-60">{table.seats} seats</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : sortedReservations.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title={q ? 'No reservations match your search' : 'No reservations yet'} />
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {sortedReservations.map((r) => {
              const busy = busyIds.has(r.id)
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{r.restaurantName}</p>
                      <p className="text-xs text-muted-text">{r.residentName}</p>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted-text">
                    {r.date.slice(0, 10)} · {r.time} · Party of {r.partySize} · {r.seating}
                    {r.tableLabel && <> · Table {r.tableLabel}</>}
                  </p>
                  {(r.status === 'pending' || r.status === 'confirmed') && (
                    <div className="mt-3 flex gap-2">
                      {r.status === 'pending' && (
                        <Button size="sm" disabled={busy} className="gap-1.5 bg-accent-indigo text-xs text-white hover:bg-accent-indigo-soft" onClick={() => confirmReservation(r.id)}>
                          <CheckCircle2 className="size-3.5" /> {busy ? 'Confirming…' : 'Confirm'}
                        </Button>
                      )}
                      {r.status === 'confirmed' && (
                        <Button size="sm" variant="outline" disabled={busy} className="gap-1.5 border-border text-xs text-foreground hover:bg-surface-hover" onClick={() => confirmArrival(r.id)}>
                          <CheckCircle2 className="size-3.5" /> {busy ? 'Confirming…' : 'Confirm arrival'}
                        </Button>
                      )}
                      <DeclineButton reservation={r} busy={busy} onConfirm={() => declineReservation(r.id)} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Restaurant</th>
                  <th className="px-4 py-3 font-medium">Resident</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Party</th>
                  <th className="px-4 py-3 font-medium">Seating</th>
                  <th className="px-4 py-3 font-medium">Table</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {sortedReservations.map((r) => {
                  const busy = busyIds.has(r.id)
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">{r.date.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-foreground">{r.restaurantName}</td>
                      <td className="px-4 py-3 text-muted-text">{r.residentName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-text">{r.time}</td>
                      <td className="px-4 py-3 text-muted-text">{r.partySize}</td>
                      <td className="px-4 py-3 text-muted-text">{r.seating}</td>
                      <td className="px-4 py-3 text-muted-text">{r.tableLabel ?? '—'}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {r.status === 'pending' && (
                            <Button size="sm" disabled={busy} className="gap-1.5 bg-accent-indigo text-xs text-white hover:bg-accent-indigo-soft" onClick={() => confirmReservation(r.id)}>
                              <CheckCircle2 className="size-3.5" /> {busy ? 'Confirming…' : 'Confirm'}
                            </Button>
                          )}
                          {r.status === 'confirmed' && (
                            <Button size="sm" variant="outline" disabled={busy} className="gap-1.5 border-border text-xs text-foreground hover:bg-surface-hover" onClick={() => confirmArrival(r.id)}>
                              <CheckCircle2 className="size-3.5" /> {busy ? 'Confirming…' : 'Confirm arrival'}
                            </Button>
                          )}
                          {(r.status === 'pending' || r.status === 'confirmed') && (
                            <DeclineButton reservation={r} busy={busy} onConfirm={() => declineReservation(r.id)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
