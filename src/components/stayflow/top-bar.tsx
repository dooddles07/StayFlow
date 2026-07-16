import { Menu, Search } from 'lucide-react'
import { NotificationBell } from './notification-bell'
import { UserAvatar } from './user-avatar'
import { useUiStore } from '#/lib/store/ui-store'

interface TopBarProps {
  identityName: string
  identitySubtitle: string
  identityLoading?: boolean
  avatarSeed?: string
  avatarStyle?: string | null
  onOpenMobileNav: () => void
}

export function TopBar({ identityName, identitySubtitle, identityLoading, avatarSeed, avatarStyle, onOpenMobileNav }: TopBarProps) {
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)

  return (
    <header className="glass-topbar sticky top-0 z-30 flex items-center gap-3 px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-text transition-colors hover:bg-surface-hover hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-[18px]" />
      </button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-border bg-surface/80 px-4 py-2 text-left text-sm text-muted-text transition-colors hover:border-accent-indigo/40 hover:text-foreground sm:max-w-sm"
      >
        <Search className="size-[15px] shrink-0" />
        <span className="truncate">Search members, facilities, events…</span>
        <kbd className="ml-auto hidden shrink-0 items-center gap-0.5 rounded-md border border-border bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium text-muted-text sm:flex">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        <NotificationBell />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <div className="hidden items-center gap-2.5 sm:flex">
          {identityLoading ? (
            <div className="size-9 shrink-0 animate-pulse rounded-full bg-surface-hover" />
          ) : (
            <UserAvatar seed={avatarSeed ?? identityName} style={avatarStyle} name={identityName} />
          )}
          <div className="max-w-[10rem]">
            {identityLoading ? (
              <>
                <div className="mb-1 h-3.5 w-24 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-16 animate-pulse rounded bg-surface-hover" />
              </>
            ) : (
              <>
                <p className="truncate text-sm font-medium leading-tight text-foreground">{identityName}</p>
                <p className="truncate text-xs leading-tight text-muted-text">{identitySubtitle}</p>
              </>
            )}
          </div>
        </div>
        <UserAvatar seed={avatarSeed ?? identityName} style={avatarStyle} name={identityName} className="sm:hidden" />
      </div>
    </header>
  )
}
