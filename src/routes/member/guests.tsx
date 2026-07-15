import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { UserPlus, Users } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { SectionHeader } from '#/components/stayflow/section-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { EmptyState } from '#/components/stayflow/empty-state'
import { QrCode } from '#/components/stayflow/qr-code'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { useMockStore, genId } from '#/lib/store/mock-store'
import { CURRENT_RESIDENT_ID } from '#/lib/session'
import { nextDays, toDateKey } from '#/lib/booking-slots'
import type { Guest } from '#/lib/mock/types'

export const Route = createFileRoute('/member/guests')({
  head: () => ({ meta: [{ title: 'Guests — StayFlow Member' }] }),
  component: GuestsPage,
})

function GuestsPage() {
  const { state, dispatch } = useMockStore()
  const days = React.useMemo(() => nextDays(14), [])

  const [name, setName] = React.useState('')
  const [purpose, setPurpose] = React.useState('')
  const [vehiclePlate, setVehiclePlate] = React.useState('')
  const [arrivalDate, setArrivalDate] = React.useState(days[0]!)
  const [arrivalTime, setArrivalTime] = React.useState('2:00 PM')
  const [newGuest, setNewGuest] = React.useState<Guest | null>(null)

  const myGuests = state.guests
    .filter((g) => g.hostResidentId === CURRENT_RESIDENT_ID)
    .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const guest: Guest = {
      id: genId('gst'),
      name: name.trim(),
      hostResidentId: CURRENT_RESIDENT_ID,
      purpose: purpose.trim() || 'Personal visit',
      vehiclePlate: vehiclePlate.trim() || undefined,
      arrivalDate: toDateKey(arrivalDate),
      arrivalTime,
      passNumber: `SF-GP-${Math.floor(10000 + Math.random() * 89999)}`,
      status: 'pending',
    }
    dispatch({ type: 'ADD_GUEST', payload: guest })
    setNewGuest(guest)
    setName('')
    setPurpose('')
    setVehiclePlate('')
    toast.success('Guest registered', { description: `${guest.name} · Pass ${guest.passNumber}` })
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
              <Label className="mb-1.5 text-xs text-muted-text">Arrival date</Label>
              <select
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
              <Input
                id="arrival-time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="border-border bg-canvas"
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Generate Pass
          </Button>
        </form>

        <div className="lg:col-span-2">
          <SectionHeader title="Your Guests" description="Passes registered for your unit" />
          {myGuests.length === 0 ? (
            <EmptyState icon={Users} title="No guests registered" description="Register a guest to generate their pass." />
          ) : (
            <div className="space-y-3">
              {myGuests.map((guest) => (
                <div key={guest.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{guest.name}</p>
                    <p className="truncate text-xs text-muted-text">
                      {guest.purpose} · {guest.arrivalDate} at {guest.arrivalTime}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-text/70">Pass {guest.passNumber}</p>
                  </div>
                  <StatusPill status={guest.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!newGuest} onOpenChange={(open) => !open && setNewGuest(null)}>
        <DialogContent className="border-border bg-surface text-foreground">
          <DialogHeader>
            <DialogTitle>Guest Pass Generated</DialogTitle>
          </DialogHeader>
          {newGuest && (
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
                  {newGuest.arrivalDate} at {newGuest.arrivalTime}
                </p>
              </div>
              <StatusPill status={newGuest.status} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
