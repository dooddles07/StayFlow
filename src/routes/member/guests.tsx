import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { ChevronDown, History, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { SectionHeader } from '#/components/stayflow/section-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { EmptyState } from '#/components/stayflow/empty-state'
import { QrCode } from '#/components/stayflow/qr-code'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
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
import { cancelGuest, getMyGuests, registerGuest, updateGuestDetails, type GuestView } from '#/lib/api/guest'
import { useMyProfile } from '#/lib/store/member-profile'
import { nextDays, toDateKey, TIME_OF_DAY_OPTIONS } from '#/lib/booking-slots'
import { byHistorySort, isPastDate, type HistorySort } from '#/lib/history'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/member/guests')({
  head: () => ({ meta: [{ title: 'Guests — StayFlow Member' }] }),
  component: GuestsPage,
})

const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

function GuestsPage() {
  const { profile, status: profileStatus, reload: reloadProfile } = useMyProfile()
  const days = React.useMemo(() => nextDays(14), [])

  const [guests, setGuests] = React.useState<GuestView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [name, setName] = React.useState('')
  const [purpose, setPurpose] = React.useState('')
  const [vehiclePlate, setVehiclePlate] = React.useState('')
  const [arrivalDate, setArrivalDate] = React.useState(days[0]!)
  const [arrivalTime, setArrivalTime] = React.useState('2:00 PM')
  const [newGuest, setNewGuest] = React.useState<GuestView | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [canceling, setCanceling] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [savingEdit, setSavingEdit] = React.useState(false)
  // Mirror each boolean but checked/updated synchronously — two clicks before React
  // re-renders (and disables the button) would both read the same stale false state
  // and both fire; a ref is always current.
  const submittingRef = React.useRef(false)
  const cancelingRef = React.useRef(false)
  const savingEditRef = React.useRef(false)
  const [editPurpose, setEditPurpose] = React.useState('')
  const [editPlate, setEditPlate] = React.useState('')
  const [editDate, setEditDate] = React.useState(days[0]!)
  const [editTime, setEditTime] = React.useState('')
  const [historySort, setHistorySort] = React.useState<HistorySort>('newest')
  const [showHistory, setShowHistory] = React.useState(false)

  const load = React.useCallback((residentId: string) => {
    let active = true
    setStatus('loading')
    getMyGuests(residentId)
      .then((data) => {
        if (!active) return
        setGuests(data)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    if (profile) return load(profile.id)
    // Profile fetch itself failed — without this the page sits on the loading
    // skeleton forever since load() never fires and never flips local status.
    if (profileStatus === 'error') setStatus('error')
  }, [profile, profileStatus, load])

  // Upcoming = still-expected visits whose arrival date hasn't passed; everything
  // else (checked-out, or any past date) drops into a collapsible history.
  const upcomingGuests = [...guests]
    .filter((g) => g.status !== 'checked-out' && !isPastDate(g.arrivalDate))
    .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate))
  const pastGuests = [...guests]
    .filter((g) => g.status === 'checked-out' || isPastDate(g.arrivalDate))
    .sort((a, b) => byHistorySort(historySort)(a.arrivalDate, b.arrivalDate))

  const guestRow = (guest: GuestView) => (
    <button
      key={guest.id}
      type="button"
      onClick={() => {
        setNewGuest(guest)
        setEditing(false)
      }}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent-indigo/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{guest.name}</p>
        <p className="truncate text-xs text-muted-text">
          {guest.purpose} · {guest.arrivalDate.slice(0, 10)} at {guest.arrivalTime}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-text/70">Pass {guest.passNumber}</p>
      </div>
      <StatusPill status={guest.status} />
    </button>
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !profile || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      // Full ISO — the API's date column rejects a bare "YYYY-MM-DD".
      const arrivalDateIso = new Date(toDateKey(arrivalDate)).toISOString()
      const guest = await registerGuest({
        name: name.trim(),
        purpose: purpose.trim() || 'Personal visit',
        vehiclePlate: vehiclePlate.trim() || undefined,
        arrivalDate: arrivalDateIso,
        arrivalTime,
      })
      setGuests((prev) => [guest, ...prev])
      setNewGuest(guest)
      setName('')
      setPurpose('')
      setVehiclePlate('')
      toast.success('Guest registered', { description: `${guest.name} · Pass ${guest.passNumber}` })
    } catch (err) {
      toast.error(errText(err))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!newGuest || cancelingRef.current) return
    cancelingRef.current = true
    setCanceling(true)
    try {
      await cancelGuest(newGuest.id)
      setGuests((prev) => prev.filter((g) => g.id !== newGuest.id))
      toast.success('Guest registration cancelled')
      setNewGuest(null)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      cancelingRef.current = false
      setCanceling(false)
    }
  }

  // Once a guest has arrived (or left), there's nothing to cancel or edit — the visit already happened.
  const canModify = newGuest?.status === 'pending' || newGuest?.status === 'approved'

  function closeDialog() {
    setNewGuest(null)
    setEditing(false)
  }

  function startEdit() {
    if (!newGuest) return
    setEditPurpose(newGuest.purpose)
    setEditPlate(newGuest.vehiclePlate ?? '')
    setEditDate(days.find((d) => toDateKey(d) === newGuest.arrivalDate.slice(0, 10)) ?? days[0]!)
    setEditTime(newGuest.arrivalTime)
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!newGuest || savingEditRef.current) return
    savingEditRef.current = true
    setSavingEdit(true)
    try {
      const updated = await updateGuestDetails(newGuest.id, {
        purpose: editPurpose.trim() || 'Personal visit',
        vehiclePlate: editPlate.trim() || undefined,
        arrivalDate: new Date(toDateKey(editDate)).toISOString(),
        arrivalTime: editTime,
      })
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
      setNewGuest(updated)
      setEditing(false)
      toast.success('Guest details updated')
    } catch (err) {
      toast.error(errText(err))
    } finally {
      savingEditRef.current = false
      setSavingEdit(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Access" title="Guests" description="Register a guest and generate their entry pass." />

      <div className="grid gap-8 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="animate-fade-in space-y-4 rounded-2xl border border-border bg-surface p-5 lg:col-span-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus className="size-4 text-accent-gold" />
            Register a Guest
          </h2>
          <div>
            <Label htmlFor="guest-name" className="mb-1.5 text-xs text-muted-text">
              Guest name
            </Label>
            <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} required className="border-border bg-canvas" />
          </div>
          <div>
            <Label htmlFor="purpose" className="mb-1.5 text-xs text-muted-text">
              Purpose of visit
            </Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Personal visit, delivery…"
              className="border-border bg-canvas"
            />
          </div>
          <div>
            <Label htmlFor="plate" className="mb-1.5 text-xs text-muted-text">
              Vehicle plate (optional)
            </Label>
            <Input id="plate" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} className="border-border bg-canvas" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="arrival-date" className="mb-1.5 text-xs text-muted-text">Arrival date</Label>
              <select
                id="arrival-date"
                value={toDateKey(arrivalDate)}
                onChange={(e) => setArrivalDate(days.find((d) => toDateKey(d) === e.target.value) ?? days[0]!)}
                className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground"
              >
                {days.map((d) => (
                  <option key={toDateKey(d)} value={toDateKey(d)}>
                    {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="arrival-time" className="mb-1.5 text-xs text-muted-text">
                Arrival time
              </Label>
              <select
                id="arrival-time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground"
              >
                {TIME_OF_DAY_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={submitting || !profile} className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            {submitting ? 'Generating…' : 'Generate Pass'}
          </Button>
        </form>

        <div className="lg:col-span-2">
          <SectionHeader title="Your Guests" description="Passes registered for your unit" />
          {status === 'loading' ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-text">We couldn't load your guests right now.</p>
              <Button
                onClick={() => (profile ? load(profile.id) : reloadProfile())}
                className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
              >
                Retry
              </Button>
            </div>
          ) : guests.length === 0 ? (
            <EmptyState icon={Users} title="No guests registered" description="Register a guest to generate their pass." />
          ) : (
            <div className="space-y-6">
              {upcomingGuests.length > 0 ? (
                <div className="space-y-3">{upcomingGuests.map(guestRow)}</div>
              ) : (
                <EmptyState icon={Users} title="No upcoming guests" description="Register a guest to generate their pass." />
              )}

              {pastGuests.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowHistory((v) => !v)}
                    aria-expanded={showHistory}
                    className="flex w-full items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-accent-indigo/40"
                  >
                    <History className="size-4 text-accent-gold" />
                    Guest History
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-muted-text">{pastGuests.length}</span>
                    <ChevronDown className={cn('ml-auto size-4 text-muted-text transition-transform', showHistory && 'rotate-180')} />
                  </button>

                  {showHistory && (
                    <div className="mt-3">
                      <div className="mb-3 flex justify-end">
                        <label className="flex items-center gap-2 text-xs text-muted-text">
                          <span className="hidden sm:inline">Sort</span>
                          <select
                            value={historySort}
                            onChange={(e) => setHistorySort(e.target.value as HistorySort)}
                            aria-label="Sort guest history"
                            className="h-8 rounded-md border border-border bg-canvas px-2 text-xs text-foreground"
                          >
                            <option value="newest">Newest first</option>
                            <option value="oldest">Oldest first</option>
                          </select>
                        </label>
                      </div>
                      <div className="space-y-3">{pastGuests.map(guestRow)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!newGuest} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="border-border bg-surface text-foreground">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Guest Details' : 'Guest Pass'}</DialogTitle>
          </DialogHeader>
          {newGuest && editing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-purpose" className="mb-1.5 text-xs text-muted-text">Purpose of visit</Label>
                <Input id="edit-purpose" value={editPurpose} onChange={(e) => setEditPurpose(e.target.value)} className="border-border bg-canvas" />
              </div>
              <div>
                <Label htmlFor="edit-plate" className="mb-1.5 text-xs text-muted-text">Vehicle plate (optional)</Label>
                <Input id="edit-plate" value={editPlate} onChange={(e) => setEditPlate(e.target.value)} className="border-border bg-canvas" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-date" className="mb-1.5 text-xs text-muted-text">Arrival date</Label>
                  <select
                    id="edit-date"
                    value={toDateKey(editDate)}
                    onChange={(e) => setEditDate(days.find((d) => toDateKey(d) === e.target.value) ?? days[0]!)}
                    className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground"
                  >
                    {days.map((d) => (
                      <option key={toDateKey(d)} value={toDateKey(d)}>
                        {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-time" className="mb-1.5 text-xs text-muted-text">Arrival time</Label>
                  <select
                    id="edit-time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground"
                  >
                    {TIME_OF_DAY_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button disabled={savingEdit} className="flex-1 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={handleSaveEdit}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : newGuest ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-canvas p-6 text-center">
              <QrCode value={newGuest.passNumber} />
              <div>
                <p className="text-base font-semibold text-foreground">{newGuest.name}</p>
                <p className="text-xs text-muted-text">{newGuest.purpose}</p>
              </div>
              <div className="w-full border-t border-border pt-3 text-xs text-muted-text">
                <p>
                  Pass Number: <span className="font-medium text-accent-gold">{newGuest.passNumber}</span>
                </p>
                <p className="mt-1">
                  {newGuest.arrivalDate.slice(0, 10)} at {newGuest.arrivalTime}
                </p>
              </div>
              <StatusPill status={newGuest.status} />
              {canModify && (
                <div className="flex w-full gap-2">
                  <Button variant="outline" className="flex-1 border-border" onClick={startEdit}>
                    Edit Details
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={canceling} className="flex-1 border-border text-rose-400 hover:bg-rose-500/10 hover:text-rose-400">
                        {canceling ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-border bg-surface">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this guest pass?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {newGuest.name} will no longer be expected, and this pass number stops working. This can't be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Keep it</AlertDialogCancel>
                        <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={handleCancel}>
                          Cancel Registration
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
