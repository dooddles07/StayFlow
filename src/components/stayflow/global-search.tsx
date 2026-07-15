import { useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { CalendarDays, UserCircle2, UtensilsCrossed, Waves } from 'lucide-react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '#/components/ui/command'
import { useMockStore } from '#/lib/store/mock-store'
import { useUiStore } from '#/lib/store/ui-store'

export function GlobalSearch() {
  const searchOpen = useUiStore((s) => s.searchOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const { state } = useMockStore()
  const navigate = useNavigate()

  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(!useUiStore.getState().searchOpen)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setSearchOpen])

  function go(to: string, id?: string) {
    setSearchOpen(false)
    if (id) navigate({ to, params: { id } as never })
    else navigate({ to })
  }

  return (
    <CommandDialog
      open={searchOpen}
      onOpenChange={setSearchOpen}
      title="Search StayFlow"
      description="Search members, facilities, restaurants, and events"
      className="border-border bg-surface text-foreground"
    >
      <CommandInput placeholder="Search members, facilities, restaurants, events…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Members">
          {state.residents.slice(0, 30).map((r) => (
            <CommandItem key={r.id} value={`${r.name} ${r.unit}`} onSelect={() => go('/management/users')}>
              <UserCircle2 />
              <span>{r.name}</span>
              <span className="ml-auto text-xs text-muted-text">{r.unit}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Facilities">
          {state.facilities.map((f) => (
            <CommandItem key={f.id} value={f.name} onSelect={() => go('/member/facilities/$id', f.id)}>
              <Waves />
              <span>{f.name}</span>
              <span className="ml-auto text-xs capitalize text-muted-text">{f.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Restaurants">
          {state.restaurants.map((r) => (
            <CommandItem key={r.id} value={r.name} onSelect={() => go('/member/dining/$id', r.id)}>
              <UtensilsCrossed />
              <span>{r.name}</span>
              <span className="ml-auto text-xs text-muted-text">{r.cuisine}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Events">
          {state.events.map((e) => (
            <CommandItem key={e.id} value={e.title} onSelect={() => go('/management/events')}>
              <CalendarDays />
              <span>{e.title}</span>
              <span className="ml-auto text-xs text-muted-text">{e.date}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
