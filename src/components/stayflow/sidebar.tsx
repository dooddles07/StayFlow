import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { navConfig, portalLabels } from './nav-config'
import { UserAvatar } from './user-avatar'
import { clearStoredPortal } from '#/lib/hooks/use-portal-preference'
import type { Portal } from '#/lib/hooks/use-portal-preference'
import { useAuthStore } from '#/lib/store/auth-store'
import { cn } from '#/lib/utils'

interface SidebarProps {
  portal: Portal
  identityName: string
  identitySubtitle: string
  identityLoading?: boolean
  avatarSeed?: string
  avatarStyle?: string | null
  navBadges?: Partial<Record<string, boolean>>
  onNavigate?: () => void
  className?: string
}

export function Sidebar({
  portal,
  identityName,
  identitySubtitle,
  identityLoading,
  avatarSeed,
  avatarStyle,
  navBadges,
  onNavigate,
  className,
}: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const items = navConfig[portal]
  const rootPath = items[0].to
  const [hovered, setHovered] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()
  const springTransition = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 500, damping: 35 }

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-dvh w-64 flex-col bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-accent-indigo/20">
          <img src="/logo.svg?v=3" alt="" className="size-6" />
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-tight tracking-tight">
            StayFlow
          </p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-text">
            {portalLabels[portal]}
          </p>
        </div>
      </div>

      <nav
        className="flex-1 space-y-1 overflow-y-auto px-3"
        onMouseLeave={() => setHovered(null)}
      >
        {items.map((item) => {
          const isActive =
            item.to === rootPath
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              // Active state was communicated by colour alone; aria-current is
              // how a screen reader is told which nav item is the current page.
              aria-current={isActive ? 'page' : undefined}
              onClick={onNavigate}
              onMouseEnter={() => setHovered(item.to)}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-indigo/15 text-foreground'
                  : 'text-muted-text hover:text-foreground',
              )}
            >
              {!isActive && hovered === item.to && (
                <motion.span
                  layoutId="sidebar-hover-highlight"
                  className="absolute inset-0 rounded-xl bg-surface-hover"
                  transition={springTransition}
                />
              )}
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent-gold"
                  transition={springTransition}
                />
              )}
              <Icon
                className={cn(
                  'relative size-[18px]',
                  isActive
                    ? 'text-accent-gold'
                    : 'text-muted-text group-hover:text-foreground',
                )}
              />
              <span className="relative">{item.label}</span>
              {navBadges?.[item.to] && (
                <span className="relative ml-auto size-1.5 shrink-0 rounded-full bg-accent-gold" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
          {identityLoading ? (
            <div className="size-9 shrink-0 animate-pulse rounded-full bg-surface-hover" />
          ) : (
            <UserAvatar
              seed={avatarSeed ?? identityName}
              style={avatarStyle}
              name={identityName}
            />
          )}
          <div className="min-w-0 flex-1">
            {identityLoading ? (
              <>
                <div className="mb-1 h-3.5 w-28 animate-pulse rounded bg-surface-hover" />
                <div className="h-3 w-20 animate-pulse rounded bg-surface-hover" />
              </>
            ) : (
              <>
                <p className="truncate text-sm font-medium text-foreground">
                  {identityName}
                </p>
                <p className="truncate text-xs text-muted-text">
                  {identitySubtitle}
                </p>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout()
            clearStoredPortal()
            navigate({ to: `/login/${portal}` })
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border px-3 py-2 text-xs font-medium text-muted-text transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <LogOut className="size-3.5" />
          Log out
        </button>
        <p className="text-center text-[10px] uppercase tracking-[0.14em] text-muted-text/50">
          by QUAN7UM
        </p>
      </div>
    </aside>
  )
}
