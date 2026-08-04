import * as React from 'react'
import { toast } from '#/lib/toast'
import { PasswordInput } from '#/components/stayflow/password-input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { ApiError } from '#/lib/api/client'
import { useAuthStore } from '#/lib/store/auth-store'

const errText = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Something went wrong. Try again.'

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-500">{msg}</p>
}

// Shared by the Profile > Security tab and the forced-change gate a MANAGEMENT-issued
// temp password lands a resident on — same form, different call-to-action copy.
export function ChangePasswordForm({
  submitLabel = 'Update Password',
}: {
  submitLabel?: string
}) {
  const changePassword = useAuthStore((s) => s.changePassword)
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const nextError =
    next && next.length < 8 ? 'Must be at least 8 characters' : ''
  const sameError =
    next && current && next === current
      ? 'Choose a password different from your current one'
      : ''
  const confirmError =
    confirm && confirm !== next ? 'Passwords do not match' : ''
  const canSubmit =
    !busy &&
    !!current &&
    next.length >= 8 &&
    confirm === next &&
    next !== current

  async function submit() {
    if (!canSubmit) return
    setBusy(true)
    try {
      await changePassword(current, next)
      toast.success('Password updated. Other devices have been signed out.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      toast.error(errText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-w-md space-y-4">
        <div>
          <Label
            htmlFor="pw-current"
            className="mb-1.5 text-xs text-muted-text"
          >
            Current password
          </Label>
          <PasswordInput
            id="pw-current"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="border-border bg-canvas"
          />
        </div>
        <div>
          <Label htmlFor="pw-new" className="mb-1.5 text-xs text-muted-text">
            New password
          </Label>
          <PasswordInput
            id="pw-new"
            autoComplete="new-password"
            value={next}
            aria-invalid={!!nextError || !!sameError}
            onChange={(e) => setNext(e.target.value)}
            className="border-border bg-canvas"
          />
          <FieldError msg={nextError || sameError} />
        </div>
        <div>
          <Label
            htmlFor="pw-confirm"
            className="mb-1.5 text-xs text-muted-text"
          >
            Confirm new password
          </Label>
          <PasswordInput
            id="pw-confirm"
            autoComplete="new-password"
            value={confirm}
            aria-invalid={!!confirmError}
            onChange={(e) => setConfirm(e.target.value)}
            className="border-border bg-canvas"
          />
          <FieldError msg={confirmError} />
        </div>
      </div>
      <p className="text-xs text-muted-text">
        Changing your password signs you out on all other devices.
      </p>
      <Button
        onClick={submit}
        disabled={!canSubmit}
        className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
      >
        {busy ? 'Updating…' : submitLabel}
      </Button>
    </div>
  )
}
