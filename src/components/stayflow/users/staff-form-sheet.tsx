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
import type { StaffShift } from '#/lib/api/staff'
import { roles, shifts } from './types'
import type { StaffDraft } from './types'

export function StaffFormSheet({
  draft,
  onOpenChange,
  onChange,
  saving,
  onSave,
}: {
  draft: StaffDraft | null
  onOpenChange: (open: boolean) => void
  onChange: (draft: StaffDraft) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <Sheet open={!!draft} onOpenChange={(open) => !open && onOpenChange(open)}>
      <SheetContent className="border-border bg-surface text-foreground">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {draft?.id ? 'Edit Staff' : 'Add Staff'}
          </SheetTitle>
        </SheetHeader>
        {draft && (
          <div className="space-y-4 px-4 pb-6">
            <div>
              <Label
                htmlFor="staff-name"
                className="mb-1.5 text-xs text-muted-text"
              >
                Name
              </Label>
              <Input
                id="staff-name"
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="staff-email"
                className="mb-1.5 text-xs text-muted-text"
              >
                Email
              </Label>
              <Input
                id="staff-email"
                value={draft.email}
                onChange={(e) => onChange({ ...draft, email: e.target.value })}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="staff-role"
                className="mb-1.5 text-xs text-muted-text"
              >
                Role
              </Label>
              <Select
                value={draft.role}
                onValueChange={(v) => onChange({ ...draft, role: v })}
              >
                <SelectTrigger
                  id="staff-role"
                  className="border-border bg-canvas"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-surface text-foreground">
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="staff-shift"
                className="mb-1.5 text-xs text-muted-text"
              >
                Shift
              </Label>
              <Select
                value={draft.shift}
                onValueChange={(v) =>
                  onChange({ ...draft, shift: v as StaffShift })
                }
              >
                <SelectTrigger
                  id="staff-shift"
                  className="border-border bg-canvas"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-surface text-foreground">
                  {shifts.map((sh) => (
                    <SelectItem key={sh} value={sh}>
                      {sh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? 'Saving…' : 'Save Staff'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
