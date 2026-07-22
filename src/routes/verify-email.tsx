import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { api, ApiError } from '#/lib/api/client'

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ title: 'Confirm your new email — StayFlow' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
    ],
  }),
  component: VerifyEmail,
})

function VerifyEmail() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function confirm() {
    setError(null)
    setLoading(true)
    try {
      await api.post('/auth/confirm-email', { token })
      toast.success('Email updated. Sign in with your new email address.')
      navigate({ to: '/login/member' })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Try again.')
    } finally {
      setLoading(false)
    }
  }

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
        to="/login/member"
        className="absolute left-6 top-6 flex items-center gap-1.5 text-xs font-medium text-muted-text transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-gold/15 text-accent-gold">
            <MailCheck className="size-7" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">Confirm email change</p>
          <h1
            className="mt-2 text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Verify your new email
          </h1>
          <p className="mt-3 max-w-xs text-sm text-muted-text">
            Confirming updates your sign-in email and signs you out on every device.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg">
          {!token ? (
            <div className="flex flex-col gap-4">
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                This verification link is invalid or has expired. Request a new one from your profile.
              </p>
              <Button asChild className="mt-1 bg-accent-gold text-canvas hover:bg-accent-gold-soft">
                <Link to="/member/profile">Go to profile</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {error && (
                <p role="alert" aria-live="polite" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}
              <Button onClick={confirm} disabled={loading} className="gap-2 bg-accent-gold text-canvas hover:bg-accent-gold-soft">
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? 'Confirming…' : 'Confirm email change'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
