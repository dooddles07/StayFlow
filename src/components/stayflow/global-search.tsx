import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { CalendarDays, ClipboardList, Megaphone, UserCircle2, Users, UtensilsCrossed, Waves } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '#/components/ui/command'
import { useUiStore } from '#/lib/store/ui-store'
import { useAuthStore } from '#/lib/store/auth-store'
import { getFacilities } from '#/lib/api/facility'
import { getRestaurants } from '#/lib/api/restaurant'
import { getEvents  } from '#/lib/api/event'
import type {CommunityEventView} from '#/lib/api/event';
import { getAllResidents  } from '#/lib/api/resident'
import type {ResidentProfile} from '#/lib/api/resident';
import { getMyGuests, getAllGuests  } from '#/lib/api/guest'
import type {GuestView} from '#/lib/api/guest';
import { getAllBookings  } from '#/lib/api/booking'
import type {BookingView} from '#/lib/api/booking';
import { getNotices } from '#/lib/api/notice'
import { useCurrentPortal } from '#/lib/hooks/use-current-portal'
import type { Portal } from '#/lib/hooks/use-portal-preference'
import type { Facility, Notice, Restaurant } from '#/lib/mock/types'

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
const guestsListPath: Record<'member' | 'staff', string> = {
  member: '/member/guests',
  staff: '/staff/guests',
}
const noticesListPath: Record<'member' | 'management', string> = {
  member: '/member/notices',
  management: '/management/notices',
}

export function GlobalSearch() {
  const searchOpen = useUiStore((s) => s.searchOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const navigate = useNavigate()
  const portal = useCurrentPortal()
  // GlobalSearch mounts once at the root, outside MemberProfileProvider — read the
  // resident id off the auth session (always available) instead of useMyProfile.
  const memberId = useAuthStore((s) => s.user?.resident?.id)

  const [facilities, setFacilities] = React.useState<Facility[]>([])
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([])
  const [events, setEvents] = React.useState<CommunityEventView[]>([])
  const [residents, setResidents] = React.useState<ResidentProfile[]>([])
  const [guests, setGuests] = React.useState<GuestView[]>([])
  const [bookings, setBookings] = React.useState<BookingView[]>([])
  const [notices, setNotices] = React.useState<Notice[]>([])

  React.useEffect(() => {
    if (!searchOpen || !portal) return
    getFacilities().then(setFacilities).catch(() => {})
    getRestaurants().then(setRestaurants).catch(() => {})
    getEvents().then(setEvents).catch(() => {})
    if (portal === 'management') {
      getAllResidents().then(setResidents).catch(() => {})
      getNotices().then(setNotices).catch(() => {})
    }
    if (portal === 'member') {
      getNotices().then(setNotices).catch(() => {})
      if (memberId) getMyGuests(memberId).then(setGuests).catch(() => {})
    }
    if (portal === 'staff') {
      getAllGuests().then(setGuests).catch(() => {})
      getAllBookings().then(setBookings).catch(() => {})
    }
  }, [searchOpen, portal, memberId])

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
        {(portal === 'member' || portal === 'staff') && (
          <CommandGroup heading="Guests">
            {guests.map((g) => (
              <CommandItem key={g.id} value={`${g.name} ${g.hostName ?? ''}`} onSelect={() => go(guestsListPath[portal])}>
                <Users />
                <span>{g.name}</span>
                <span className="ml-auto text-xs capitalize text-muted-text">{g.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {portal === 'staff' && (
          <CommandGroup heading="Bookings">
            {bookings.map((b) => (
              <CommandItem
                key={b.id}
                value={`${b.facilityName ?? ''} ${b.residentName ?? ''}`}
                onSelect={() => go('/staff/bookings')}
              >
                <ClipboardList />
                <span>{b.facilityName}</span>
                <span className="ml-auto text-xs text-muted-text">{b.residentName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {(portal === 'member' || portal === 'management') && (
          <CommandGroup heading="Notices">
            {notices.map((n) => (
              <CommandItem key={n.id} value={n.title} onSelect={() => go(noticesListPath[portal])}>
                <Megaphone />
                <span>{n.title}</span>
                <span className="ml-auto text-xs text-muted-text">{n.category}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
