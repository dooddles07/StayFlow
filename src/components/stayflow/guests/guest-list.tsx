import { ChevronDown, History, Users } from 'lucide-react'
import { EmptyState } from '#/components/stayflow/empty-state'
import { SectionHeader } from '#/components/stayflow/section-header'
import { StatusPill } from '#/components/stayflow/status-pill'
import { Button } from '#/components/ui/button'
import type { GuestView } from '#/lib/api/guest'
import type { HistorySort } from '#/lib/history'
import { cn } from '#/lib/utils'

interface GuestListProps {
  status: 'loading' | 'ready' | 'error'
  guests: GuestView[]
  upcomingGuests: GuestView[]
  pastGuests: GuestView[]
  showHistory: boolean
  historySort: HistorySort
  onRetry: () => void
  onSelect: (guest: GuestView) => void
  onToggleHistory: () => void
  onHistorySortChange: (sort: HistorySort) => void
}

export function GuestList({
  status,
  guests,
  upcomingGuests,
  pastGuests,
  showHistory,
  historySort,
  onRetry,
  onSelect,
  onToggleHistory,
  onHistorySortChange,
}: GuestListProps) {
  const guestRow = (guest: GuestView) => (
    <button
      key={guest.id}
      type="button"
      onClick={() => onSelect(guest)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent-indigo/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {guest.name}
        </p>
        <p className="truncate text-xs text-muted-text">
          {guest.purpose} · {guest.arrivalDate.slice(0, 10)} at{' '}
          {guest.arrivalTime}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-text/70">
          Pass {guest.passNumber}
        </p>
      </div>
      <StatusPill status={guest.status} />
    </button>
  )

  return (
    <div className="lg:col-span-2">
      <SectionHeader
        title="Your Guests"
        description="Passes registered for your unit"
      />
      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">
            We couldn't load your guests right now.
          </p>
          <Button
            onClick={onRetry}
            className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            Retry
          </Button>
        </div>
      ) : guests.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No guests registered"
          description="Register a guest to generate their pass."
        />
      ) : (
        <div className="space-y-6">
          {upcomingGuests.length > 0 ? (
            <div className="space-y-3">{upcomingGuests.map(guestRow)}</div>
          ) : (
            <EmptyState
              icon={Users}
              title="No upcoming guests"
              description="Register a guest to generate their pass."
            />
          )}

          {pastGuests.length > 0 && (
            <div>
              <button
                type="button"
                onClick={onToggleHistory}
                aria-expanded={showHistory}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-accent-indigo/40"
              >
                <History className="size-4 text-accent-gold" />
                Guest History
                <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-muted-text">
                  {pastGuests.length}
                </span>
                <ChevronDown
                  className={cn(
                    'ml-auto size-4 text-muted-text transition-transform',
                    showHistory && 'rotate-180',
                  )}
                />
              </button>

              {showHistory && (
                <div className="mt-3">
                  <div className="mb-3 flex justify-end">
                    <label className="flex items-center gap-2 text-xs text-muted-text">
                      <span className="hidden sm:inline">Sort</span>
                      <select
                        value={historySort}
                        onChange={(e) =>
                          onHistorySortChange(e.target.value as HistorySort)
                        }
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
  )
}
