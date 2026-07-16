import { useLocation, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { CalendarDays, UserCircle2, UtensilsCrossed, Waves } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '#/components/ui/command'
import { useUiStore } from '#/lib/store/ui-store'
import { getFacilities } from '#/lib/api/facility'
import { getRestaurants } from '#/lib/api/restaurant'
import { getEvents, type CommunityEventView } from '#/lib/api/event'
import { getAllResidents, type ResidentProfile } from '#/lib/api/resident'
import type { Portal } from '#/lib/hooks/use-portal-preference'
import type { Facility, Restaurant } from '#/lib/mock/types'

// Every destination below stays inside the current portal — search must never
// hand a member/staff/management user a link into a portal they can't access.
function useCurrentPortal(): Portal | null {
  const { pathname } = useLocation()
  if (pathname.startsWith('/member')) return 'member'
  if (pathname.startsWith('/staff')) return 'staff'
  if (pathname.startsWith('/management')) return 'management'
  return null
}

const facilitiesListPath: Record<Portal, string> = {
  member: '/member/facilities',
  staff: '/staff/facilities',
  management: '/management/facilities',
}
const diningListPath: Record<Portal, string> = {
  member: '/member/dining',
  staff: '/staff/dining',
  management: '/management/restaurants',
}
const eventsListPath: Record<Portal, string> = {
  member: '/member/events',
  staff: '/staff/events',
  management: '/management/events',
}

export function GlobalSearch() {
  const searchOpen = useUiStore((s) => s.searchOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const navigate = useNavigate()
  const portal = useCurrentPortal()

  const [facilities, setFacilities] = React.useState<Facility[]>([])
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([])
  const [events, setEvents] = React.useState<CommunityEventView[]>([])
  const [residents, setResidents] = React.useState<ResidentProfile[]>([])

  React.useEffect(() => {
    if (!searchOpen || !portal) return
    getFacilities().then(setFacilities).catch(() => {})
    getRestaurants().then(setRestaurants).catch(() => {})
    getEvents().then(setEvents).catch(() => {})
    if (portal === 'management') getAllResidents().then(setResidents).catch(() => {})
  }, [searchOpen, portal])

  React.useEffect(() => {
    if (!portal) return
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(!useUiStore.getState().searchOpen)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setSearchOpen, portal])

  if (!portal) return null

  function go(to: string, id?: string) {
    setSearchOpen(false)
    // Member has real detail pages; staff/management land on the list (no $id routes there).
    if (id && portal === 'member') navigate({ to, params: { id } } as never)
    else navigate({ to } as never)
  }

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="Search StayFlow"
      description="Search facilities, dining, and events"
      className="border-border bg-surface text-foreground"
    >
      <CommandInput placeholder="Search facilities, dining, events…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {portal === 'management' && (
          <CommandGroup heading="Members">
            {residents.slice(0, 30).map((r) => (
              <CommandItem key={r.id} value={`${r.name} ${r.unit}`} onSelect={() => go('/management/users')}>
                <UserCircle2 />
                <span>{r.name}</span>
                <span className="ml-auto text-xs text-muted-text">{r.unit}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Facilities">
          {facilities.map((f) => (
            <CommandItem
              key={f.id}
              value={f.name}
              onSelect={() => go(portal === 'member' ? '/member/facilities/$id' : facilitiesListPath[portal], f.id)}
            >
              <Waves />
              <span>{f.name}</span>
              <span className="ml-auto text-xs capitalize text-muted-text">{f.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Dining">
          {restaurants.map((r) => (
            <CommandItem
              key={r.id}
              value={r.name}
              onSelect={() => go(portal === 'member' ? '/member/dining/$id' : diningListPath[portal], r.id)}
            >
              <UtensilsCrossed />
              <span>{r.name}</span>
              <span className="ml-auto text-xs text-muted-text">{r.cuisine}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Events">
          {events.map((e) => (
            <CommandItem key={e.id} value={e.title} onSelect={() => go(eventsListPath[portal])}>
              <CalendarDays />
              <span>{e.title}</span>
              <span className="ml-auto text-xs text-muted-text">{e.date.slice(0, 10)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
