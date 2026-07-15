import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, BarChart3, ShieldCheck, UserCircle2 } from 'lucide-react'
import * as React from 'react'
import type { Portal } from '#/lib/hooks/use-portal-preference'
import { getStoredPortal } from '#/lib/hooks/use-portal-preference'
import { isPortalRoleMatch, useAuthStore } from '#/lib/store/auth-store'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'StayFlow by QUAN7UM — Choose Your Portal' },
      { name: 'description', content: 'Enter the Member, Staff, or Management portal for StayFlow.' },
    ],
  }),
  component: LandingPage,
})

const portals: {
  id: Portal
  title: string
  description: string
  icon: typeof UserCircle2
}[] = [
  {
    id: 'member',
    title: 'Member',
    description: 'Book facilities, reserve dining, manage guests, and stay in the loop on community life.',
    icon: UserCircle2,
  },
  {
    id: 'staff',
    title: 'Staff',
    description: 'Run daily operations — approve bookings, check in guests, and manage facility status.',
    icon: ShieldCheck,
  },
  {
    id: 'management',
    title: 'Management',
    description: 'Executive KPIs, analytics, and full administrative control over the community platform.',
    icon: BarChart3,
  },
]

function LandingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const [checkedStorage, setCheckedStorage] = React.useState(false)

  React.useEffect(() => {
    if (!hasHydrated) return

    const stored = getStoredPortal()
    if (stored && user && isPortalRoleMatch(user.role, stored)) {
      navigate({ to: `/${stored}`, replace: true })
      return
    }
    setCheckedStorage(true)
  }, [navigate, user, hasHydrated])

  function selectPortal(id: Portal) {
    if (user && isPortalRoleMatch(user.role, id)) {
      navigate({ to: `/${id}` })
      return
    }
    navigate({ to: `/login/${id}` })
  }

  if (!checkedStorage) return null

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-canvas px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(720px 420px at 15% 10%, color-mix(in oklab, var(--color-accent-indigo) 22%, transparent), transparent 60%), radial-gradient(680px 420px at 85% 90%, color-mix(in oklab, var(--color-accent-gold) 16%, transparent), transparent 60%)',
        }}
      />

      <div className="relative animate-fade-in flex flex-col items-center text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-indigo/15">
          <img src="/logo.svg" alt="StayFlow" className="size-9" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">by QUAN7UM</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">StayFlow</h1>
        <p className="mt-3 max-w-md text-sm text-muted-text sm:text-base">
          A premium community management platform. Choose a portal to continue.
        </p>
      </div>

      <div className="relative mt-12 grid w-full max-w-4xl gap-5 sm:grid-cols-3">
        {portals.map((portal, index) => {
          const Icon = portal.icon
          return (
            <button
              key={portal.id}
              type="button"
              onClick={() => selectPortal(portal.id)}
              className={cn(
                'animate-fade-in group flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-6 text-left transition-all hover:-translate-y-1 hover:border-accent-indigo/50 hover:bg-surface-hover',
                index === 0 && 'animate-fade-in-delay-1',
                index === 1 && 'animate-fade-in-delay-2',
                index === 2 && 'animate-fade-in-delay-3',
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-gold transition-transform group-hover:scale-105">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-base font-semibold text-foreground">{portal.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-text">{portal.description}</p>
              </div>
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-accent-indigo-soft transition-colors group-hover:text-accent-gold">
                Enter portal
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          )
        })}
      </div>

      <p className="relative mt-12 text-[11px] text-muted-text/60">Demo data. Sign in with your portal credentials.</p>
    </div>
  )
}
