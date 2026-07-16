import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { CheckCircle2, LogOut, QrCode as QrCodeIcon, ScanLine, Search, UserCheck } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { EmptyState } from '#/components/stayflow/empty-state'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ApiError } from '#/lib/api/client'
import { checkInGuest, checkOutGuest, getAllGuests, setGuestStatus, type GuestView } from '#/lib/api/guest'
import { toDateKey } from '#/lib/booking-slots'

export const Route = createFileRoute('/staff/guests')({
  head: () => ({ meta: [{ title: 'Guests — StayFlow Staff' }] }),
  component: StaffGuestsPage,
})

const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

function StaffGuestsPage() {
  const today = toDateKey(new Date())
  const [guests, setGuests] = React.useState<GuestView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [tab, setTab] = React.useState<'arriving' | 'history'>('arriving')
  const [scannerOpen, setScannerOpen] = React.useState(false)
  const [passInput, setPassInput] = React.useState('')
  const [busyIds, setBusyIds] = React.useState<Set<string>>(new Set())
  const [query, setQuery] = React.useState('')

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    getAllGuests()
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

  React.useEffect(() => load(), [load])

  const q = query.trim().toLowerCase()
  const matchesQuery = (g: GuestView) =>
    q === '' ||
    g.name.toLowerCase().includes(q) ||
    g.passNumber.toLowerCase().includes(q) ||
    (g.hostName ?? '').toLowerCase().includes(q)

  const arriving = guests
    .filter((g) => g.arrivalDate.slice(0, 10) === today && (g.status === 'pending' || g.status === 'approved' || g.status === 'checked-in'))
    .filter(matchesQuery)
    .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime))

  const history = guests
    .filter((g) => g.status === 'checked-out' || g.arrivalDate.slice(0, 10) < today)
    .filter(matchesQuery)
    .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate))

  async function withBusy(id: string, action: () => Promise<GuestView>, successMessage: string) {
    if (busyIds.has(id)) return
    setBusyIds((prev) => new Set(prev).add(id))
    try {
      const updated = await action()
      setGuests((prev) => prev.map((g) => (g.id === id ? updated : g)))
      toast.success(successMessage)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const approve = (id: string) => withBusy(id, () => setGuestStatus(id, 'approved'), 'Guest approved')
  const checkIn = (id: string) => withBusy(id, () => checkInGuest(id), 'Guest checked in')
  const checkOut = (id: string) => withBusy(id, () => checkOutGuest(id), 'Guest checked out')

  function handleScanLookup() {
    const guest = guests.find((g) => g.passNumber.toLowerCase() === passInput.trim().toLowerCase())
    if (!guest) {
      toast.error('Pass number not found')
      return
    }
    checkIn(guest.id)
    setScannerOpen(false)
    setPassInput('')
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Access Control"
        title="Guests"
        description="Check guests in and out of the community."
        actions={
          <Button size="lg" className="gap-2 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setScannerOpen(true)}>
            <ScanLine className="size-4" />
            Check In
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by guest, host, or pass number…"
          aria-label="Search guests"
          className="border-border bg-surface pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
        <TabsList className="bg-surface">
          <TabsTrigger value="arriving" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Arriving Today
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load guests right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : tab === 'arriving' ? (
        arriving.length === 0 ? (
          <EmptyState icon={UserCheck} title={q ? 'No guests match your search' : 'No guests arriving today'} />
        ) : (
          <div className="space-y-3">
            {arriving.map((guest) => {
              const busy = busyIds.has(guest.id)
              return (
                <div key={guest.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{guest.name}</p>
                    <p className="text-xs text-muted-text">
                      Hosted by {guest.hostName ?? 'Resident'} · {guest.arrivalTime} · Pass {guest.passNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={guest.status} />
                    {guest.status === 'pending' && (
                      <Button size="sm" variant="outline" disabled={busy} className="border-border text-foreground hover:bg-surface-hover" onClick={() => approve(guest.id)}>
                        {busy ? 'Approving…' : 'Approve'}
                      </Button>
                    )}
                    {guest.status === 'approved' && (
                      <Button size="sm" disabled={busy} className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => checkIn(guest.id)}>
                        <CheckCircle2 className="size-3.5" /> {busy ? 'Checking in…' : 'Check In'}
                      </Button>
                    )}
                    {guest.status === 'checked-in' && (
                      <Button size="sm" variant="outline" disabled={busy} className="gap-1.5 border-border text-foreground hover:bg-surface-hover" onClick={() => checkOut(guest.id)}>
                        <LogOut className="size-3.5" /> {busy ? 'Checking out…' : 'Check Out'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : history.length === 0 ? (
        <EmptyState icon={UserCheck} title={q ? 'No guests match your search' : 'No guest history yet'} />
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {history.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{guest.name}</p>
                  <p className="text-xs text-muted-text">{guest.arrivalDate.slice(0, 10)} · Hosted by {guest.hostName ?? 'Resident'}</p>
                </div>
                <StatusPill status={guest.status} />
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
                <tr>
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Host</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {history.map((guest) => (
                  <tr key={guest.id}>
                    <td className="px-4 py-3 text-foreground">{guest.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-text">{guest.arrivalDate.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-muted-text">{guest.hostName ?? 'Resident'}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={guest.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="border-border bg-surface text-foreground">
          <DialogHeader>
            <DialogTitle>Check In Guest</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-canvas p-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-accent-indigo/15 text-accent-gold">
              <QrCodeIcon className="size-7" />
            </span>
            <p className="text-sm text-muted-text">Type the guest's pass number below to check them in.</p>
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="SF-GP-48213"
              className="border-border bg-canvas"
              onKeyDown={(e) => e.key === 'Enter' && handleScanLookup()}
            />
            <Button onClick={handleScanLookup} className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
              <Search className="size-4" />
              Look up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
