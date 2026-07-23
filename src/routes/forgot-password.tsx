import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { api, ApiError } from '#/lib/api/client'

export const Route = createFileRoute('/forgot-password')({
  head: () => ({
    meta: [{ title: 'Reset your password — StayFlow' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
    ],
  }),
  component: ForgotPassword,
})

function ForgotPassword() {
  const [email, setEmail] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  // Mirrors loading but checked/updated synchronously — two clicks before React
  // re-renders (and disables the button) would both read the same stale false and
  // both fire; a ref is always current.
  const loadingRef = React.useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loadingRef.current) return
    setError(null)

    if (!email) {
      setError('Enter your email address.')
      return
    }

    loadingRef.current = true
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      // Always show the same confirmation — never reveal whether the email is registered.
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Try again.')
    } finally {
      loadingRef.current = false
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
            {sent ? <MailCheck className="size-7" /> : <KeyRound className="size-7" />}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">Account recovery</p>
          <h1
            className="mt-2 text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {sent ? 'Check your inbox' : 'Forgot password'}
          </h1>
          <p className="mt-3 max-w-xs text-sm text-muted-text">
            {sent
              ? `If an account exists for ${email}, a password reset link is on its way. The link expires in 1 hour.`
              : 'Enter the email tied to your account and we’ll send you a link to reset your password.'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg">
          {sent ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-text">
                Didn’t get an email? Check your spam folder, or{' '}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-medium text-accent-gold underline-offset-4 hover:underline"
                >
                  try a different address
                </button>
                .
              </p>
              <Button asChild className="mt-1 bg-accent-gold text-canvas hover:bg-accent-gold-soft">
                <Link to="/login/member">Return to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@stayflow.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  aria-invalid={error ? true : undefined}
                />
              </div>

              {error && (
                <p role="alert" aria-live="polite" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="mt-1 gap-2 bg-accent-gold text-canvas hover:bg-accent-gold-soft">
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? 'Sending link…' : 'Send reset link'}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-text/60">
          Remembered it?{' '}
          <Link to="/login/member" className="text-muted-text underline-offset-4 hover:text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
