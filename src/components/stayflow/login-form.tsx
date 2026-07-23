import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { PasswordInput } from '#/components/stayflow/password-input'
import { setStoredPortal, type Portal } from '#/lib/hooks/use-portal-preference'
import { ApiError, isPortalRoleMatch, useAuthStore } from '#/lib/store/auth-store'
import { cn } from '#/lib/utils'

interface LoginFormProps {
  portal: Portal
  portalLabel: string
  className?: string
  submitClassName?: string
}

export function LoginForm({ portal, portalLabel, className, submitClassName }: LoginFormProps) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  // Mirrors loading but checked/updated synchronously — two clicks before React
  // re-renders (and disables the button) would both read the same stale false and
  // both fire; a ref is always current.
  const loadingRef = React.useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loadingRef.current) return
    setError(null)

    if (!email || !password) {
      setError('Enter both email and password.')
      return
    }

    loadingRef.current = true
    setLoading(true)
    try {
      const user = await login(email, password)
      if (!isPortalRoleMatch(user.role, portal)) {
        await useAuthStore.getState().logout()
        setError(`That account isn't a ${portalLabel} account. Use the correct portal login.`)
        return
      }
      setStoredPortal(portal)
      toast.success(`Welcome back, ${user.displayName}`)
      navigate({ to: `/${portal}` })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Try again.')
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${portal}-email`}>Email</Label>
        <Input
          id={`${portal}-email`}
          type="email"
          autoComplete="email"
          placeholder="you@stayflow.io"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${portal}-password`}>Password</Label>
          <Link
            to="/forgot-password"
            className="text-xs font-medium text-muted-text underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id={`${portal}-password`}
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className={cn('mt-1 gap-2', submitClassName)}>
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
