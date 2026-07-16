import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Waves } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { SectionHeader } from '#/components/stayflow/section-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { FacilityCard } from '#/components/stayflow/facility-card'
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
import { getFacilities } from '#/lib/api/facility'
import { cancelBooking, getMyBookings, type BookingView } from '#/lib/api/booking'
import { useMyProfile } from '#/lib/store/member-profile'
import type { Facility, FacilityCategory } from '#/lib/mock/types'

export const Route = createFileRoute('/member/facilities/')({
  head: () => ({ meta: [{ title: 'Facilities — StayFlow Member' }] }),
  component: FacilitiesList,
})

const categories: (FacilityCategory | 'All')[] = ['All', 'Wellness', 'Sports', 'Entertainment', 'Recreation', 'Function']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

function FacilitiesList() {
  const { profile } = useMyProfile()
  const [facilities, setFacilities] = React.useState<Facility[]>([])
  const [bookings, setBookings] = React.useState<BookingView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [category, setCategory] = React.useState<(typeof categories)[number]>('All')
  const [cancelingId, setCancelingId] = React.useState<string | null>(null)

  const load = React.useCallback((residentId?: string) => {
    let active = true
    setStatus('loading')
    Promise.all([getFacilities(), residentId ? getMyBookings(residentId) : Promise.resolve([])])
      .then(([f, b]) => {
        if (!active) return
        setFacilities(f)
        setBookings(b)
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
  }, [profile, load])

  const filtered = category === 'All' ? facilities : facilities.filter((f) => f.category === category)
  const upcoming = [...bookings]
    .filter((b) => b.status === 'pending' || b.status === 'confirmed')
    .sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot))

  async function handleCancel(id: string) {
    if (cancelingId) return
    setCancelingId(id)
    try {
      await cancelBooking(id)
      setBookings((prev) => prev.filter((b) => b.id !== id))
      toast.success('Booking cancelled')
    } catch (err) {
      toast.error(errText(err))
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Amenities"
        title="Facilities"
        description="Browse and reserve community amenities, from the sky pool to the private screening room."
      />

      {status === 'ready' && upcoming.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="Your Bookings" description="Upcoming requests and confirmations" />
          <div className="space-y-3">
            {upcoming.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.facilityName ?? 'Facility'}</p>
                  <p className="text-xs text-muted-text">
                    {b.date.slice(0, 10)} · {b.timeSlot} · Party of {b.partySize}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={b.status} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" disabled={cancelingId === b.id} className="border-border text-rose-400 hover:bg-rose-500/10 hover:text-rose-400">
                        {cancelingId === b.id ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-border bg-surface">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your slot at {b.facilityName ?? 'this facility'} on {b.date.slice(0, 10)} · {b.timeSlot} will be released. This can't be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Keep it</AlertDialogCancel>
                        <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => handleCancel(b.id)}>
                          Cancel Booking
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionHeader title="Facilities" />

      <Tabs value={category} onValueChange={(v) => setCategory(v as typeof category)} className="mb-6">
        <TabsList className="bg-surface">
          {categories.map((c) => (
            <TabsTrigger key={c} value={c} className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {status === 'loading' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load facilities right now.</p>
          <Button onClick={() => load(profile?.id)} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Waves} title="No facilities in this category" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      )}
    </div>
  )
}
