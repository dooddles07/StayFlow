import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, UserCircle2 } from 'lucide-react'
import { LoginForm } from '#/components/stayflow/login-form'

export const Route = createFileRoute('/login/member')({
  head: () => ({
    meta: [{ title: 'Member Sign In — StayFlow' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
    ],
  }),
  component: MemberLogin,
})

function MemberLogin() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-6 py-16">
      <img
        src="/images/hero/member-login.png"
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-canvas/70" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(720px 480px at 50% -10%, color-mix(in oklab, var(--color-accent-gold) 18%, transparent), transparent 60%), radial-gradient(680px 420px at 90% 100%, color-mix(in oklab, var(--color-accent-indigo) 20%, transparent), transparent 60%)',
        }}
      />

      <Link
        to="/"
        className="absolute left-6 top-6 flex items-center gap-1.5 text-xs font-medium text-muted-text transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All portals
      </Link>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-gold/15 text-accent-gold">
            <UserCircle2 className="size-7" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">Member Portal</p>
          <h1
            className="mt-2 text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Welcome back
          </h1>
          <p className="mt-3 max-w-xs text-sm text-muted-text">
            Sign in to book facilities, reserve dining, manage guests, and stay in the loop on community life.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg">
          <LoginForm
            portal="member"
            portalLabel="Member"
            submitClassName="bg-accent-gold text-canvas hover:bg-accent-gold-soft"
          />
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-text/60">Demo access — ask your administrator for credentials.</p>
      </div>
    </div>
  )
}
