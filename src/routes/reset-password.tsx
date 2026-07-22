import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { api, ApiError } from '#/lib/api/client'

const MIN_PASSWORD_LENGTH = 8

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  head: () => ({
    meta: [{ title: 'Set a new password — StayFlow' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
    ],
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords don’t match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password updated. Sign in with your new password.')
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
            <ShieldCheck className="size-7" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-gold">Account recovery</p>
          <h1
            className="mt-2 text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Set a new password
          </h1>
          <p className="mt-3 max-w-xs text-sm text-muted-text">Choose a strong password you don’t use anywhere else.</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg">
          {!token ? (
            <div className="flex flex-col gap-4">
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                This reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Button asChild className="mt-1 bg-accent-gold text-canvas hover:bg-accent-gold-soft">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    aria-invalid={error ? true : undefined}
                    aria-describedby="password-hint"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    disabled={loading}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    aria-pressed={show}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-text transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p id="password-hint" className="text-[11px] text-muted-text">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
