import * as React from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { Bell, CalendarDays, ClipboardCheck, Megaphone, ShieldCheck, UtensilsCrossed, Users } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { ScrollArea } from '#/components/ui/scroll-area'
import { Button } from '#/components/ui/button'
import { useMockStore } from '#/lib/store/mock-store'
import { useAuthStore } from '#/lib/store/auth-store'
import { useCurrentPortal } from '#/lib/hooks/use-current-portal'
import { getMyNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from '#/lib/api/notification'
import { cn } from '#/lib/utils'
import type { NotificationKind } from '#/lib/mock/types'

const kindIcon: Record<NotificationKind, typeof Bell> = {
  booking: ClipboardCheck,
  guest: Users,
  dining: UtensilsCrossed,
  event: CalendarDays,
  notice: Megaphone,
  system: ShieldCheck,
}

function NotificationList({
  items,
  onMarkRead,
  onMarkAllRead,
  onOpenChange,
}: {
  items: { id: string; kind: NotificationKind; title: string; body: string; createdAt: string; read: boolean }[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onOpenChange?: (open: boolean) => void
}) {
  const unread = items.filter((n) => !n.read)
  const sorted = [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-text transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
        >
          <Bell className="size-[18px]" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent-gold px-1 text-[10px] font-semibold leading-[18px] text-canvas ring-2 ring-canvas">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 border-border bg-surface p-0 text-foreground">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-accent-indigo-soft hover:text-accent-gold"
              onClick={onMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {sorted.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-text">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {sorted.map((n) => {
                const Icon = kindIcon[n.kind]
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onMarkRead(n.id)}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover',
                        !n.read && 'bg-accent-indigo/[0.06]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                          n.read ? 'bg-surface-hover text-muted-text' : 'bg-accent-indigo/20 text-accent-gold',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={cn('truncate text-sm font-medium', !n.read && 'text-foreground')}>{n.title}</span>
                          {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-accent-gold" />}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-muted-text">{n.body}</span>
                        <span className="mt-1 block text-[11px] text-muted-text/70">
                          {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// Live for the member portal (has a real per-resident notification feed).
// Staff/management still read the local mock store — no per-user backend scoping
// exists for those roles yet; wiring them is a separate, later pass.
function MemberNotificationBell({ residentId }: { residentId: string }) {
  const [items, setItems] = React.useState<AppNotification[]>([])

  const load = React.useCallback(() => {
    let active = true
    getMyNotifications(residentId)
      .then((data) => active && setItems(data))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [residentId])

  // Poll so new notifications surface without a full page reload; also refetch on open.
  React.useEffect(() => {
    const cleanup = load()
    const timer = setInterval(load, 60_000)
    return () => {
      cleanup()
      clearInterval(timer)
    }
  }, [load])

  async function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await markNotificationRead(id)
    } catch {
      load()
    }
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await markAllNotificationsRead(residentId)
    } catch {
      load()
    }
  }

  return (
    <NotificationList
      items={items}
      onMarkRead={handleMarkRead}
      onMarkAllRead={handleMarkAllRead}
      onOpenChange={(open) => open && load()}
    />
  )
}

function MockNotificationBell() {
  const { state, dispatch } = useMockStore()
  return (
    <NotificationList
      items={state.notifications}
      onMarkRead={(id) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { id } })}
      onMarkAllRead={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })}
    />
  )
}

export function NotificationBell() {
  const portal = useCurrentPortal()
  const residentId = useAuthStore((s) => s.user?.resident?.id)

  if (portal === 'member' && residentId) return <MemberNotificationBell residentId={residentId} />
  return <MockNotificationBell />
}
