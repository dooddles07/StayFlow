import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { PageHeader } from '#/components/stayflow/page-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import { ApiError } from '#/lib/api/client'
import { getFacilities, setFacilityStatus } from '#/lib/api/facility'
import type { Facility, FacilityStatus } from '#/lib/mock/types'

export const Route = createFileRoute('/staff/facilities')({
  head: () => ({ meta: [{ title: 'Facilities — StayFlow Staff' }] }),
  component: StaffFacilitiesPage,
})

const statusOptions: FacilityStatus[] = ['open', 'maintenance', 'closed']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

function StaffFacilitiesPage() {
  const [facilities, setFacilities] = React.useState<Facility[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [reasonDrafts, setReasonDrafts] = React.useState<Record<string, string>>({})
  const [savingId, setSavingId] = React.useState<string | null>(null)
  // Mirrors savingId but checked/updated synchronously — two clicks (on different
  // facilities) before React re-renders would both read the same stale null savingId
  // and pass the guard; a ref is always current.
  const savingRef = React.useRef<string | null>(null)

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

  async function updateStatus(id: string, next: FacilityStatus, currentReason?: string) {
    if (savingRef.current) return
    savingRef.current = id
    setSavingId(id)
    const reason = next === 'open' ? undefined : (reasonDrafts[id] ?? currentReason)
    try {
      const updated = await setFacilityStatus(id, next, reason)
      setFacilities((prev) => prev.map((f) => (f.id === id ? updated : f)))
      toast.success(`Facility marked ${next}`)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      savingRef.current = null
      setSavingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Amenities" title="Facilities" description="Update facility availability for residents in real time." />

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load facilities right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {facilities.map((facility) => (
            <div key={facility.id} className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{facility.name}</p>
                  <p className="text-xs text-muted-text">{facility.location} · {facility.category}</p>
                </div>
                <StatusPill status={facility.status} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={savingId === facility.id}
                    onClick={() => updateStatus(facility.id, s, facility.statusReason)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      facility.status === s
                        ? 'border-accent-gold bg-accent-indigo/15 text-accent-gold'
                        : 'border-border text-muted-text hover:border-accent-indigo/40 hover:text-foreground',
                    )}
                  >
                    {s}
                  </button>
                ))}

                {facility.status !== 'open' && (
                  <div className="flex flex-1 min-w-[200px] items-center gap-2">
                    <Input
                      value={reasonDrafts[facility.id] ?? facility.statusReason ?? ''}
                      onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [facility.id]: e.target.value }))}
                      placeholder="Reason (e.g. resurfacing courts)"
                      className="h-8 border-border bg-canvas text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingId === facility.id}
                      className="h-8 shrink-0 border-border text-xs text-foreground hover:bg-surface-hover"
                      onClick={() => updateStatus(facility.id, facility.status, reasonDrafts[facility.id])}
                    >
                      Save reason
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
