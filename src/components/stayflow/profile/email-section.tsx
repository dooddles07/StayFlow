import * as React from 'react'
import { toast } from '#/lib/toast'
import { PasswordInput } from '#/components/stayflow/password-input'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { useMyProfile } from '#/lib/store/member-profile'
import { useAuthStore } from '#/lib/store/auth-store'
import { EMAIL_RE, FieldError, errText } from './profile-helpers'

// --- Change email (verify-then-apply) ---
export function EmailSection() {
  const currentEmail = useMyProfile().profile?.email ?? ''
  const requestEmailChange = useAuthStore((s) => s.requestEmailChange)
  const [newEmail, setNewEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const emailError =
    newEmail && !EMAIL_RE.test(newEmail) ? 'Enter a valid email address' : ''
  const sameError =
    newEmail && newEmail.toLowerCase() === currentEmail.toLowerCase()
      ? 'This is already your email'
      : ''
  const canSubmit =
    !busy &&
    !!password &&
    EMAIL_RE.test(newEmail) &&
    newEmail.toLowerCase() !== currentEmail.toLowerCase()

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    try {
      const message = await requestEmailChange(newEmail.trim(), password)
      toast.success(message)
      setNewEmail('')
      setPassword('')
    } catch (err) {
      toast.error(errText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Email address</p>
        <p className="text-xs text-muted-text">Current: {currentEmail}</p>
      </div>
      <div className="max-w-md space-y-4">
        <div>
          <Label htmlFor="email-new" className="mb-1.5 text-xs text-muted-text">
            New email
          </Label>
          <Input
            id="email-new"
            type="email"
            autoComplete="email"
            value={newEmail}
            aria-invalid={!!emailError || !!sameError}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border-border bg-canvas"
          />
          <FieldError msg={emailError || sameError} />
        </div>
        <div>
          <Label
            htmlFor="email-password"
            className="mb-1.5 text-xs text-muted-text"
          >
            Current password
          </Label>
          <PasswordInput
            id="email-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-border bg-canvas"
          />
        </div>
      </div>
      <p className="text-xs text-muted-text">
        We'll send a verification link to the new address. Your email changes
        only after you open it.
      </p>
      <Button
        onClick={submit}
        disabled={!canSubmit}
        className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
      >
        {busy ? 'Sending…' : 'Send verification link'}
      </Button>
    </div>
  )
}
