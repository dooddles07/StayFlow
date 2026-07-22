import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowUpRight, BarChart3 } from 'lucide-react'
import { LoginForm } from '#/components/stayflow/login-form'

export const Route = createFileRoute('/login/management')({
  head: () => ({
    meta: [{ title: 'Management Sign In — StayFlow' }],
  }),
  component: ManagementLogin,
})

const kpis = [
  { label: 'Occupancy', value: '96%' },
  { label: 'NPS', value: '72' },
  { label: 'Open tickets', value: '3' },
]

function ManagementLogin() {
  return (
    <div className="relative flex min-h-dvh items-center justify-end overflow-hidden bg-canvas px-6 py-16 sm:px-12 lg:px-24">
      <img
        src="/images/hero/management-login.png"
        alt=""
        className="animate-ken-burns pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-canvas/70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-gold/70 to-transparent" />

      <Link
        to="/"
        className="absolute left-6 top-6 flex items-center gap-1.5 text-xs font-medium text-muted-text transition-colors hover:text-foreground sm:left-12 lg:left-24"
      >
        <ArrowLeft className="size-3.5" />
        All portals
      </Link>

      <div className="relative hidden max-w-sm flex-col gap-6 pr-16 lg:flex xl:pr-24">
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent-gold/15 text-accent-gold">
          <BarChart3 className="size-6" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">Management Console</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Executive oversight, in one place.</h1>
          <p className="mt-3 text-sm text-muted-text">
            Community KPIs, analytics, and full administrative control over the platform.
          </p>
        </div>
        <div className="flex gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-lg font-semibold text-accent-gold">{kpi.value}</p>
              <p className="text-[11px] text-muted-text">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent-gold/15 text-accent-gold">
            <BarChart3 className="size-5" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">Management Console</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Sign in</h2>
          <p className="mt-1 mb-6 text-sm text-muted-text">Authorized personnel only.</p>
          <LoginForm
            portal="management"
            portalLabel="Management"
            submitClassName="bg-accent-gold text-canvas hover:bg-accent-gold-soft"
          />
        </div>

        <Link
          to="/login/staff"
          className="mt-4 flex items-center justify-center gap-1 text-[11px] text-muted-text/70 transition-colors hover:text-foreground"
        >
          Looking for staff sign in?
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  )
}
