import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { FieldError } from './profile-helpers'
import type { ProfileTabProps } from './profile-helpers'

// The secondary contact is optional as a whole, but half-filled is worse than
// empty — computeErrors requires a name and phone once any of its fields is set.
export function EmergencyTab({
  form,
  setForm,
  errors,
  saving,
  dirty,
  save,
}: ProfileTabProps) {
  const primary = form.emergencyContact
  const secondary = form.emergencyContact2

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label
            htmlFor="emergency-name"
            className="mb-1.5 text-xs text-muted-text"
          >
            Contact name
          </Label>
          <Input
            id="emergency-name"
            value={primary.name}
            aria-invalid={!!errors.emName}
            onChange={(e) =>
              setForm({
                ...form,
                emergencyContact: { ...primary, name: e.target.value },
              })
            }
            className="border-border bg-canvas"
          />
          <FieldError msg={errors.emName} />
        </div>
        <div>
          <Label
            htmlFor="emergency-relation"
            className="mb-1.5 text-xs text-muted-text"
          >
            Relation
          </Label>
          <Input
            id="emergency-relation"
            value={primary.relation}
            aria-invalid={!!errors.emRelation}
            onChange={(e) =>
              setForm({
                ...form,
                emergencyContact: { ...primary, relation: e.target.value },
              })
            }
            className="border-border bg-canvas"
          />
          <FieldError msg={errors.emRelation} />
        </div>
        <div className="sm:col-span-2">
          <Label
            htmlFor="emergency-phone"
            className="mb-1.5 text-xs text-muted-text"
          >
            Phone
          </Label>
          <Input
            id="emergency-phone"
            value={primary.phone}
            aria-invalid={!!errors.emPhone}
            onChange={(e) =>
              setForm({
                ...form,
                emergencyContact: { ...primary, phone: e.target.value },
              })
            }
            className="border-border bg-canvas"
          />
          <FieldError msg={errors.emPhone} />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm font-medium text-foreground">
          Secondary contact{' '}
          <span className="font-normal text-muted-text">· optional</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label
              htmlFor="emergency2-name"
              className="mb-1.5 text-xs text-muted-text"
            >
              Contact name
            </Label>
            <Input
              id="emergency2-name"
              value={secondary.name}
              aria-invalid={!!errors.em2Name}
              onChange={(e) =>
                setForm({
                  ...form,
                  emergencyContact2: { ...secondary, name: e.target.value },
                })
              }
              className="border-border bg-canvas"
            />
            <FieldError msg={errors.em2Name} />
          </div>
          <div>
            <Label
              htmlFor="emergency2-relation"
              className="mb-1.5 text-xs text-muted-text"
            >
              Relation
            </Label>
            <Input
              id="emergency2-relation"
              value={secondary.relation}
              onChange={(e) =>
                setForm({
                  ...form,
                  emergencyContact2: { ...secondary, relation: e.target.value },
                })
              }
              className="border-border bg-canvas"
            />
          </div>
          <div className="sm:col-span-2">
            <Label
              htmlFor="emergency2-phone"
              className="mb-1.5 text-xs text-muted-text"
            >
              Phone
            </Label>
            <Input
              id="emergency2-phone"
              value={secondary.phone}
              aria-invalid={!!errors.em2Phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  emergencyContact2: { ...secondary, phone: e.target.value },
                })
              }
              className="border-border bg-canvas"
            />
            <FieldError msg={errors.em2Phone} />
          </div>
        </div>
      </div>

      <Button
        onClick={() =>
          save(
            {
              emergencyName: primary.name.trim(),
              emergencyRelation: primary.relation.trim(),
              emergencyPhone: primary.phone.trim(),
              emergency2Name: secondary.name.trim(),
              emergency2Relation: secondary.relation.trim(),
              emergency2Phone: secondary.phone.trim(),
            },
            'Emergency contact saved',
            ['emName', 'emRelation', 'emPhone', 'em2Name', 'em2Phone'],
          )
        }
        disabled={
          saving ||
          !dirty ||
          !!errors.emName ||
          !!errors.emRelation ||
          !!errors.emPhone ||
          !!errors.em2Name ||
          !!errors.em2Phone
        }
        className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}
