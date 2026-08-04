import { Checkbox } from '#/components/ui/checkbox'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { tierLabel } from '#/lib/api/resident'
import type { ResidentTier } from '#/lib/api/resident'
import { tiers } from './types'
import type { ResidentDraft } from './types'

export function ResidentFormSheet({
  draft,
  onOpenChange,
  onChange,
  isManagement,
  createLoginToo,
  onCreateLoginTooChange,
  saving,
  onSave,
}: {
  draft: ResidentDraft | null
  onOpenChange: (open: boolean) => void
  onChange: (draft: ResidentDraft) => void
  isManagement: boolean
  createLoginToo: boolean
  onCreateLoginTooChange: (value: boolean) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <Sheet open={!!draft} onOpenChange={(open) => !open && onOpenChange(open)}>
      <SheetContent className="border-border bg-surface text-foreground">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {draft?.id ? 'Edit Member' : 'Add Member'}
          </SheetTitle>
        </SheetHeader>
        {draft && (
          <div className="space-y-4 px-4 pb-6">
            <div>
              <Label
                htmlFor="resident-name"
                className="mb-1.5 text-xs text-muted-text"
              >
                Name
              </Label>
              <Input
                id="resident-name"
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="resident-email"
                className="mb-1.5 text-xs text-muted-text"
              >
                Email
              </Label>
              <Input
                id="resident-email"
                value={draft.email}
                onChange={(e) => onChange({ ...draft, email: e.target.value })}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="resident-unit"
                className="mb-1.5 text-xs text-muted-text"
              >
                Unit
              </Label>
              <Input
                id="resident-unit"
                value={draft.unit}
                onChange={(e) => onChange({ ...draft, unit: e.target.value })}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="resident-tier"
                className="mb-1.5 text-xs text-muted-text"
              >
                Tier
              </Label>
              <Select
                value={draft.tier}
                onValueChange={(v) =>
                  onChange({ ...draft, tier: v as ResidentTier })
                }
              >
                <SelectTrigger
                  id="resident-tier"
                  className="border-border bg-canvas"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-surface text-foreground">
                  {tiers.map((t) => (
                    <SelectItem key={t} value={t}>
                      {tierLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!draft.id && isManagement && (
              <label className="flex items-start gap-2.5 rounded-xl border border-border bg-canvas p-3">
                <Checkbox
                  checked={createLoginToo}
                  onCheckedChange={(v) => onCreateLoginTooChange(!!v)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-text">
                  <span className="block font-medium text-foreground">
                    Also create a login now
                  </span>
                  Generates a temporary password to relay to the resident in
                  person. You can do this later from the table instead.
                </span>
              </label>
            )}
            {!draft.id && (
              <p className="text-[11px] text-muted-text">
                This reserves the unit. Phone and emergency contact are filled
                in by the resident once they have a login.
              </p>
            )}
            <Button
              className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? 'Saving…' : 'Save Member'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
