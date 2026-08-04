import { Link, useLocation } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import * as React from 'react'
import { navConfig } from './nav-config'
import type { Portal } from '#/lib/hooks/use-portal-preference'
import { cn } from '#/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'

const MAX_VISIBLE = 4

export function MobileBottomNav({ portal, navBadges }: { portal: Portal; navBadges?: Partial<Record<string, boolean>> }) {
  const location = useLocation()
  const [moreOpen, setMoreOpen] = React.useState(false)
  const items = navConfig[portal]
  const rootPath = items[0].to
  const visible = items.slice(0, MAX_VISIBLE)
  const overflow = items.slice(MAX_VISIBLE)

  function isActive(to: string) {
    return to === rootPath ? location.pathname === to : location.pathname.startsWith(to)
  }

  return (
    <>
      <nav className="glass-topbar fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {visible.map((item) => {
          const active = isActive(item.to)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
                active ? 'text-accent-gold' : 'text-muted-text',
              )}
            >
              <Icon className="size-[19px]" />
              {item.label}
              {navBadges?.[item.to] && <span className="absolute right-[28%] top-1.5 size-1.5 rounded-full bg-accent-gold" />}
            </Link>
          )
        })}
        {overflow.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium',
              overflow.some((i) => isActive(i.to)) ? 'text-accent-gold' : 'text-muted-text',
            )}
          >
            <MoreHorizontal className="size-[19px]" />
            More
            {overflow.some((i) => navBadges?.[i.to]) && (
              <span className="absolute right-[28%] top-1.5 size-1.5 rounded-full bg-accent-gold" />
            )}
          </button>
        )}
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-6">
            {overflow.map((item) => {
              const Icon = item.icon
              const active = isActive(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-xl border border-border px-3 py-4 text-xs font-medium',
                    active ? 'border-accent-gold/50 bg-accent-indigo/10 text-accent-gold' : 'text-muted-text hover:text-foreground',
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                  {navBadges?.[item.to] && <span className="absolute right-3 top-3 size-1.5 rounded-full bg-accent-gold" />}
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
