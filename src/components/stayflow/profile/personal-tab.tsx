import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { FieldError } from './profile-helpers'
import type { ProfileTabProps } from './profile-helpers'

// Unit and email are read-only here on purpose: unit decides what a resident may
// book, and email is the login identity, so both change through management or
// the verified email flow rather than a text box.
export function PersonalTab({
  form,
  setForm,
  errors,
  saving,
  dirty,
  save,
}: ProfileTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label
            htmlFor="profile-name"
            className="mb-1.5 text-xs text-muted-text"
          >
            Full name
          </Label>
          <Input
            id="profile-name"
            value={form.name}
            aria-invalid={!!errors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border-border bg-canvas"
          />
          <FieldError msg={errors.name} />
        </div>
        <div>
          <Label
            htmlFor="profile-unit"
            className="mb-1.5 text-xs text-muted-text"
          >
            Unit
          </Label>
          <Input
            id="profile-unit"
            value={form.unit}
            readOnly
            disabled
            className="border-border bg-canvas"
          />
        </div>
        <div>
          <Label
            htmlFor="profile-email"
            className="mb-1.5 text-xs text-muted-text"
          >
            Email
          </Label>
          <Input
            id="profile-email"
            value={form.email}
            readOnly
            disabled
            className="border-border bg-canvas"
          />
        </div>
        <div>
          <Label
            htmlFor="profile-phone"
            className="mb-1.5 text-xs text-muted-text"
          >
            Phone
          </Label>
          <Input
            id="profile-phone"
            value={form.phone}
            aria-invalid={!!errors.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="border-border bg-canvas"
          />
          <FieldError msg={errors.phone} />
        </div>
      </div>
      <Button
        onClick={() =>
          save(
            { name: form.name.trim(), phone: form.phone.trim() },
            'Personal details saved',
            ['name', 'phone'],
          )
        }
        disabled={saving || !dirty || !!errors.name || !!errors.phone}
        className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}
