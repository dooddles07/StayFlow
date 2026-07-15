import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, ClipboardCheck, ShieldCheck, Users } from 'lucide-react'
import { LoginForm } from '#/components/stayflow/login-form'

export const Route = createFileRoute('/login/staff')({
  head: () => ({
    meta: [{ title: 'Staff Sign In — StayFlow' }],
  }),
  component: StaffLogin,
})

const shiftPoints = [
  { icon: ClipboardCheck, label: 'Approve bookings & reservations' },
  { icon: Users, label: 'Check in guests at the door' },
  { icon: CheckCircle2, label: 'Update facility status in real time' },
]

function StaffLogin() {
  return (
    <div className="flex min-h-dvh bg-canvas">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-surface p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(color-mix(in oklab, var(--color-accent-indigo) 14%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--color-accent-indigo) 14%, transparent) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <Link
          to="/"
          className="relative flex items-center gap-1.5 text-xs font-medium text-muted-text transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          All portals
        </Link>

        <div className="relative">
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-accent-indigo/20 text-accent-indigo-soft">
            <ShieldCheck className="size-6" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-indigo-soft">Staff Portal</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Run today's shift.</h1>
          <ul className="mt-6 space-y-3">
            {shiftPoints.map((point) => (
              <li key={point.label} className="flex items-center gap-3 text-sm text-muted-text">
                <point.icon className="size-4 shrink-0 text-accent-indigo-soft" />
                {point.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] text-muted-text/60">StayFlow Operations</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 lg:hidden">
            <Link
              to="/"
              className="mb-6 flex items-center gap-1.5 text-xs font-medium text-muted-text transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              All portals
            </Link>
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-accent-indigo/20 text-accent-indigo-soft">
              <ShieldCheck className="size-6" />
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-indigo-soft">Staff Sign In</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Clock in to your console</h2>
          <p className="mt-2 text-sm text-muted-text">Enter your operations credentials to continue.</p>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-lg">
            <LoginForm
              portal="staff"
              portalLabel="Staff"
              submitClassName="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
            />
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-text/60">Demo access — ask your administrator for credentials.</p>
        </div>
      </div>
    </div>
  )
}
