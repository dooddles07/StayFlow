import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
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
import { clampPositiveInt } from '#/lib/booking-slots'
import type {
  Facility,
  FacilityCategory,
  FacilityStatus,
} from '#/lib/domain/types'
import { CATEGORIES, STATUSES } from './facility-helpers'

interface FacilityFormSheetProps {
  editing: Facility | null
  saving: boolean
  onChange: (next: Facility) => void
  onClose: () => void
  onSave: () => void
}

export function FacilityFormSheet({
  editing,
  saving,
  onChange,
  onClose,
  onSave,
}: FacilityFormSheetProps) {
  return (
    <Sheet open={!!editing} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="border-border bg-surface text-foreground">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {editing?.id ? 'Edit Facility' : 'Add Facility'}
          </SheetTitle>
        </SheetHeader>
        {editing && (
          <div className="space-y-4 px-4 pb-6">
            <div>
              <Label
                htmlFor="facility-name"
                className="mb-1.5 text-xs text-muted-text"
              >
                Name
              </Label>
              <Input
                id="facility-name"
                value={editing.name}
                onChange={(e) => onChange({ ...editing, name: e.target.value })}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="facility-description"
                className="mb-1.5 text-xs text-muted-text"
              >
                Description
              </Label>
              <Textarea
                id="facility-description"
                value={editing.description}
                onChange={(e) =>
                  onChange({ ...editing, description: e.target.value })
                }
                className="border-border bg-canvas"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="facility-category"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Category
                </Label>
                <Select
                  value={editing.category}
                  onValueChange={(v) =>
                    onChange({ ...editing, category: v as FacilityCategory })
                  }
                >
                  <SelectTrigger
                    id="facility-category"
                    className="border-border bg-canvas"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label
                  htmlFor="facility-status"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Status
                </Label>
                <Select
                  value={editing.status}
                  onValueChange={(v) =>
                    onChange({ ...editing, status: v as FacilityStatus })
                  }
                >
                  <SelectTrigger
                    id="facility-status"
                    className="border-border bg-canvas"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="facility-capacity"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Capacity
                </Label>
                <Input
                  id="facility-capacity"
                  type="number"
                  min={1}
                  value={editing.capacity}
                  onChange={(e) =>
                    onChange({
                      ...editing,
                      capacity: clampPositiveInt(
                        e.target.value,
                        editing.capacity,
                      ),
                    })
                  }
                  className="border-border bg-canvas"
                />
              </div>
              <div>
                <Label
                  htmlFor="facility-open-hours"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Open hours
                </Label>
                <Input
                  id="facility-open-hours"
                  value={editing.openHours}
                  onChange={(e) =>
                    onChange({ ...editing, openHours: e.target.value })
                  }
                  className="border-border bg-canvas"
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="facility-location"
                className="mb-1.5 text-xs text-muted-text"
              >
                Location
              </Label>
              <Input
                id="facility-location"
                value={editing.location}
                onChange={(e) =>
                  onChange({ ...editing, location: e.target.value })
                }
                className="border-border bg-canvas"
              />
            </div>
            <Button
              className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? 'Saving…' : 'Save Facility'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
