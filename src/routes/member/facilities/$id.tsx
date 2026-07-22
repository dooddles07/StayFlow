import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft, Info, MapPin, Star, Users as UsersIcon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { StatusPill } from '#/components/stayflow/status-pill'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { FACILITY_TIME_SLOTS, clampPartySize, nextDays, toDateKey } from '#/lib/booking-slots'
import { ApiError } from '#/lib/api/client'
import { getFacility } from '#/lib/api/facility'
import { getFacilityBookings, requestBooking, type FacilitySlot } from '#/lib/api/booking'
import { useMyProfile } from '#/lib/store/member-profile'
import { cn, hideBrokenImg } from '#/lib/utils'

export const Route = createFileRoute('/member/facilities/$id')({
  loader: async ({ params }) => {
    try {
      const facility = await getFacility(params.id)
      return { facility }
    } catch (err) {
      // Only a genuine "no such facility" should render as Not Found — anything
      // else (401, network blip) is a real error and shouldn't lie about why.
      if (err instanceof ApiError && err.status === 404) throw notFound()
      throw err
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.facility.name ?? 'Facility'} — StayFlow` }] }),
  component: FacilityDetail,
})

const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

function FacilityDetail() {
  const { facility } = Route.useLoaderData()
  const { profile } = useMyProfile()
  const days = React.useMemo(() => nextDays(14), [])
  const [selectedDay, setSelectedDay] = React.useState(days[0]!)
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null)
  const [partySize, setPartySize] = React.useState(1)
  const [notes, setNotes] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  // Mirrors submitting but checked/updated synchronously — two clicks before React
  // re-renders (and disables the button) would both read the same stale false and
  // both fire; a ref is always current.
  const submittingRef = React.useRef(false)
  const [slots, setSlots] = React.useState<FacilitySlot[]>([])

  React.useEffect(() => {
    let active = true
    getFacilityBookings(facility.id).then((rows) => {
      if (active) setSlots(rows)
    })
    return () => {
      active = false
    }
  }, [facility.id])

  const dateKey = toDateKey(selectedDay)

  function slotStatus(slot: string): 'available' | 'pending' | 'booked' {
    const match = slots.find((s) => s.date.slice(0, 10) === dateKey && s.timeSlot === slot)
    if (!match) return 'available'
    return match.status === 'pending' ? 'pending' : 'booked'
  }

  async function handleConfirmBooking() {
    if (!selectedSlot || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const dateIso = new Date(dateKey).toISOString()
      await requestBooking({
        facilityId: facility.id,
        date: dateIso,
        timeSlot: selectedSlot,
        partySize,
        notes: notes.trim() || undefined,
      })
      setSlots((prev) => [...prev, { date: dateIso, timeSlot: selectedSlot, status: 'pending' }])
      setConfirmOpen(false)
      setSelectedSlot(null)
      setNotes('')
      toast.success('Booking requested', {
        description: `${facility.name} · ${selectedDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${selectedSlot}`,
      })
    } catch (err) {
      toast.error(errText(err))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const isDisabled = facility.status !== 'open'

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/member/facilities" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to Facilities
      </Link>

      <div className="animate-fade-in relative mb-6 h-56 w-full overflow-hidden rounded-2xl bg-surface-hover sm:h-72">
        <img
          src={facility.image}
          alt={facility.name}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onError={hideBrokenImg}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-canvas via-canvas/20 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <StatusPill status={facility.status} className="mb-2" />
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{facility.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
              <MapPin className="size-3.5" />
              {facility.location}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-canvas/60 px-2.5 py-1 text-sm text-accent-gold backdrop-blur">
            <Star className="size-3.5 fill-current" />
            {facility.rating}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">About</h2>
            <p className="text-sm leading-relaxed text-muted-text">{facility.description}</p>
            <p className="mt-3 text-xs text-muted-text">Open {facility.openHours} · Capacity {facility.capacity}</p>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">House Rules</h2>
            <ul className="space-y-1.5">
              {facility.rules.map((rule) => (
                <li key={rule} className="flex items-start gap-2 text-xs text-muted-text">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-accent-indigo-soft" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {facility.statusReason && (
            <div className="rounded-xl border border-accent-gold/30 bg-accent-gold/10 px-4 py-3 text-xs text-accent-gold">
              {facility.statusReason}
            </div>
          )}
        </div>

        <div className="animate-fade-in rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Reserve a Slot</h2>

          {isDisabled ? (
            <p className="rounded-xl bg-surface-hover px-3 py-4 text-center text-xs text-muted-text">
              This facility is currently {facility.status} and cannot be booked.
            </p>
          ) : (
            <>
              <p className="mb-2 text-xs font-medium text-muted-text">Select a date</p>
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {days.map((day) => {
                  const active = toDateKey(day) === dateKey
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => {
                        setSelectedDay(day)
                        setSelectedSlot(null)
                      }}
                      className={cn(
                        'flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-xs transition-colors',
                        active
                          ? 'border-accent-gold bg-accent-indigo/15 text-foreground'
                          : 'border-border text-muted-text hover:border-accent-indigo/40',
                      )}
                    >
                      <span className="font-medium">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                      <span className="text-[11px]">{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </button>
                  )
                })}
              </div>

              <p className="mb-2 text-xs font-medium text-muted-text">Select a time</p>
              <div className="mb-5 grid grid-cols-1 gap-2">
                {FACILITY_TIME_SLOTS.map((slot) => {
                  const status = slotStatus(slot)
                  const active = selectedSlot === slot
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={status !== 'available'}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs transition-colors disabled:cursor-not-allowed',
                        active && 'border-accent-gold bg-accent-indigo/15 text-foreground',
                        !active && status === 'available' && 'border-border text-foreground hover:border-accent-indigo/40',
                        status === 'pending' && 'border-accent-gold/30 bg-accent-gold/10 text-accent-gold/70',
                        status === 'booked' && 'border-rose-500/20 bg-rose-500/5 text-rose-400/60',
                      )}
                    >
                      {slot}
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          status === 'available' && 'bg-emerald-400',
                          status === 'pending' && 'bg-accent-gold',
                          status === 'booked' && 'bg-rose-400',
                        )}
                      />
                    </button>
                  )
                })}
              </div>

              <div className="mb-4 space-y-3">
                <div>
                  <Label htmlFor="party-size" className="mb-1.5 text-xs text-muted-text">
                    Party size
                  </Label>
                  <Input
                    id="party-size"
                    type="number"
                    min={1}
                    max={facility.capacity}
                    value={partySize}
                    onChange={(e) => setPartySize(clampPartySize(e.target.value, facility.capacity))}
                    className="border-border bg-canvas"
                  />
                </div>
                <div>
                  <Label htmlFor="notes" className="mb-1.5 text-xs text-muted-text">
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests…"
                    className="border-border bg-canvas"
                    rows={2}
                  />
                </div>
              </div>

              <Button
                className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft"
                disabled={!selectedSlot || !profile}
                onClick={() => setConfirmOpen(true)}
              >
                Request Booking
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your booking</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-text">
              <span className="mt-2 flex flex-col gap-1 text-sm text-foreground">
                <span className="font-medium">{facility.name}</span>
                <span>
                  {selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · {selectedSlot}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-text">
                  <UsersIcon className="size-3.5" /> Party of {partySize}
                </span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction disabled={submitting} className="bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={handleConfirmBooking}>
              {submitting ? 'Confirming…' : 'Confirm Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
