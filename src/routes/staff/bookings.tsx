import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Calendar, Check, ClipboardList, List, X } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { EmptyState } from '#/components/stayflow/empty-state'
import { Button } from '#/components/ui/button'
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
import { getAllBookings, setBookingStatus, type BookingView } from '#/lib/api/booking'
import type { BookingStatus } from '#/lib/mock/types'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/staff/bookings')({
  head: () => ({ meta: [{ title: 'Bookings — StayFlow Staff' }] }),
  component: BookingsPage,
})

const statusFilters: (BookingStatus | 'all')[] = ['all', 'pending', 'confirmed', 'cancelled']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

// Same pattern as staff/dining.tsx's DeclineButton — every other irreversible status
// change in the app is confirm-gated; this one was a bare click next to the approve
// button, one misclick from instantly rejecting a resident's booking.
function RejectButton({ booking, busy, onConfirm }: { booking: BookingView; busy: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" disabled={busy} className="size-7 text-rose-400 hover:bg-rose-500/10">
          <X className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border bg-surface">
        <AlertDialogHeader>
          <AlertDialogTitle>Reject this booking?</AlertDialogTitle>
          <AlertDialogDescription>
            {booking.residentName ?? 'This resident'}'s {booking.facilityName ?? 'facility'} booking for {booking.date.slice(0, 10)} · {booking.timeSlot} will be declined. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border">Keep it</AlertDialogCancel>
          <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm}>
            Reject Booking
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function BookingsPage() {
  const [bookings, setBookings] = React.useState<BookingView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [statusFilter, setStatusFilter] = React.useState<(typeof statusFilters)[number]>('all')
  const [view, setView] = React.useState<'table' | 'calendar'>('table')
  const [busyIds, setBusyIds] = React.useState<Set<string>>(new Set())
  // Mirrors busyIds but checked/updated synchronously — two clicks on the same button
  // before React re-renders (and disables it) would both read the same stale busyIds
  // state and pass the guard; a ref is always current.
  const busyRef = React.useRef<Set<string>>(new Set())

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    getAllBookings()
      .then((rows) => {
        if (!active) return
        setBookings(rows)
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

  const filtered = [...bookings]
    .filter((b) => statusFilter === 'all' || b.status === statusFilter)
    .sort((a, b) => a.date.localeCompare(b.date))

  async function updateStatus(id: string, next: BookingStatus) {
    if (busyRef.current.has(id)) return
    busyRef.current.add(id)
    setBusyIds(new Set(busyRef.current))
    try {
      const updated = await setBookingStatus(id, next)
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)))
      toast.success(next === 'confirmed' ? 'Booking approved' : 'Booking rejected')
    } catch (err) {
      toast.error(errText(err))
    } finally {
      busyRef.current.delete(id)
      setBusyIds(new Set(busyRef.current))
    }
  }

  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, b) => {
    ;(acc[b.date.slice(0, 10)] ??= []).push(b)
    return acc
  }, {})

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Reservations"
        title="Bookings"
        description="Review and manage all facility booking requests."
        actions={
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setView('table')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs', view === 'table' ? 'bg-accent-indigo/20 text-accent-gold' : 'text-muted-text')}
            >
              <List className="size-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs', view === 'calendar' ? 'bg-accent-indigo/20 text-accent-gold' : 'text-muted-text')}
            >
              <Calendar className="size-3.5" /> Calendar
            </button>
          </div>
        }
      />

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} className="mb-6">
        <TabsList className="bg-surface">
          {statusFilters.map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load bookings right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No bookings match this filter" />
      ) : view === 'table' ? (
        <>
          <div className="space-y-3 sm:hidden">
            {filtered.map((b) => {
              const busy = busyIds.has(b.id)
              return (
                <div key={b.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{b.facilityName}</p>
                      <p className="text-xs text-muted-text">{b.residentName}</p>
                    </div>
                    <StatusPill status={b.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted-text">{b.date.slice(0, 10)} · {b.timeSlot} · Party of {b.partySize}</p>
                  {b.status === 'pending' && (
                    <div className="mt-3 flex justify-end gap-1.5">
                      <Button size="icon" variant="ghost" disabled={busy} className="size-7 text-emerald-400 hover:bg-emerald-500/10" onClick={() => updateStatus(b.id, 'confirmed')}>
                        <Check className="size-4" />
                      </Button>
                      <RejectButton booking={b} busy={busy} onConfirm={() => updateStatus(b.id, 'cancelled')} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Facility</th>
                  <th className="px-4 py-3 font-medium">Resident</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Party</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filtered.map((b) => {
                  const busy = busyIds.has(b.id)
                  return (
                    <tr key={b.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">{b.date.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-foreground">{b.facilityName}</td>
                      <td className="px-4 py-3 text-muted-text">{b.residentName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-text">{b.timeSlot}</td>
                      <td className="px-4 py-3 text-muted-text">{b.partySize}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={b.status} />
                      </td>
                      <td className="px-4 py-3">
                        {b.status === 'pending' ? (
                          <div className="flex justify-end gap-1.5">
                            <Button size="icon" variant="ghost" disabled={busy} className="size-7 text-emerald-400 hover:bg-emerald-500/10" onClick={() => updateStatus(b.id, 'confirmed')}>
                              <Check className="size-4" />
                            </Button>
                            <RejectButton booking={b} busy={busy} onConfirm={() => updateStatus(b.id, 'cancelled')} />
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-muted-text/60">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-gold">{date}</p>
              <div className="space-y-2">
                {items.map((b) => {
                  const busy = busyIds.has(b.id)
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">
                          {b.facilityName} · {b.timeSlot}
                        </p>
                        <p className="text-xs text-muted-text">{b.residentName} · Party of {b.partySize}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={b.status} />
                        {b.status === 'pending' && (
                          <>
                            <Button size="icon" variant="ghost" disabled={busy} className="size-7 text-emerald-400 hover:bg-emerald-500/10" onClick={() => updateStatus(b.id, 'confirmed')}>
                              <Check className="size-4" />
                            </Button>
                            <RejectButton booking={b} busy={busy} onConfirm={() => updateStatus(b.id, 'cancelled')} />
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
