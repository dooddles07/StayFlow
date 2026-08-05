import * as React from 'react'
import { Upload } from 'lucide-react'
import { toast } from '#/lib/toast'
import { UploadUnavailableError, uploadPhoto } from '#/lib/api/upload'
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
import type { EventCategory } from '#/lib/domain/types'
import {
  CATEGORIES,
  DEFAULT_EVENT_IMAGE,
  LOCATION_OPTIONS,
  MAX_PHOTO_BYTES,
  OTHER_LOCATION,
} from './event-helpers'
import type { EventDraft } from './event-helpers'

interface EventFormSheetProps {
  editing: EventDraft | null
  saving: boolean
  onChange: (next: EventDraft) => void
  onClose: () => void
  onSave: () => void
}

export function EventFormSheet({
  editing,
  saving,
  onChange,
  onClose,
  onSave,
}: EventFormSheetProps) {
  const [uploading, setUploading] = React.useState(false)
  const photoInputRef = React.useRef<HTMLInputElement>(null)

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editing) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('That photo is too large — please use one under 2 MB.')
      return
    }
    setUploading(true)
    try {
      const url = await uploadPhoto(file)
      onChange({ ...editing, image: url })
    } catch (err) {
      toast.error(
        err instanceof UploadUnavailableError
          ? 'Photo uploads are not set up yet — paste a photo link instead.'
          : 'Could not upload that photo. Try a different file.',
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <Sheet open={!!editing} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="border-border bg-surface text-foreground">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {editing?.id ? 'Edit Event' : 'Create Event'}
          </SheetTitle>
        </SheetHeader>
        {editing && (
          <div className="space-y-4 px-4 pb-6">
            <div>
              <Label
                htmlFor="event-title"
                className="mb-1.5 text-xs text-muted-text"
              >
                Title
              </Label>
              <Input
                id="event-title"
                value={editing.title}
                onChange={(e) =>
                  onChange({ ...editing, title: e.target.value })
                }
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="event-description"
                className="mb-1.5 text-xs text-muted-text"
              >
                Description
              </Label>
              <Textarea
                id="event-description"
                value={editing.description}
                onChange={(e) =>
                  onChange({ ...editing, description: e.target.value })
                }
                className="border-border bg-canvas"
                rows={3}
              />
            </div>
            <div>
              <Label
                htmlFor="event-image-url"
                className="mb-1.5 text-xs text-muted-text"
              >
                Event photo{' '}
                <span className="font-normal text-muted-text/70">
                  · optional
                </span>
              </Label>
              <div className="flex items-center gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
                  <img
                    src={editing.image.trim() || DEFAULT_EVENT_IMAGE}
                    alt=""
                    className="size-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_EVENT_IMAGE
                    }}
                  />
                </div>
                <Input
                  id="event-image-url"
                  value={editing.image}
                  onChange={(e) =>
                    onChange({ ...editing, image: e.target.value })
                  }
                  placeholder="Paste a photo link, or upload one"
                  className="border-border bg-canvas"
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChosen}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0 border-border"
                  aria-label="Upload a photo from your device"
                  disabled={uploading}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="size-4" />
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-text/70">
                Paste a link above, or use the upload button to choose a photo
                from your phone or computer.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="event-category"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Category
                </Label>
                <Select
                  value={editing.category}
                  onValueChange={(v) =>
                    onChange({ ...editing, category: v as EventCategory })
                  }
                >
                  <SelectTrigger
                    id="event-category"
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
                  htmlFor="event-capacity"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Capacity
                </Label>
                <Input
                  id="event-capacity"
                  type="number"
                  min={1}
                  value={editing.capacity}
                  onChange={(e) =>
                    onChange({
                      ...editing,
                      capacity: Number(e.target.value) || 0,
                    })
                  }
                  className="border-border bg-canvas"
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="event-date"
                className="mb-1.5 text-xs text-muted-text"
              >
                Date
              </Label>
              <Input
                id="event-date"
                type="date"
                value={editing.date}
                onChange={(e) => onChange({ ...editing, date: e.target.value })}
                className="border-border bg-canvas"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="event-start-time"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Start time
                </Label>
                <Input
                  id="event-start-time"
                  value={editing.time}
                  onChange={(e) =>
                    onChange({ ...editing, time: e.target.value })
                  }
                  className="border-border bg-canvas"
                />
              </div>
              <div>
                <Label
                  htmlFor="event-end-time"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  End time{' '}
                  <span className="font-normal text-muted-text/70">
                    · optional
                  </span>
                </Label>
                <Input
                  id="event-end-time"
                  value={editing.endTime}
                  onChange={(e) =>
                    onChange({ ...editing, endTime: e.target.value })
                  }
                  className="border-border bg-canvas"
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="event-location"
                className="mb-1.5 text-xs text-muted-text"
              >
                Location
              </Label>
              <Select
                value={
                  LOCATION_OPTIONS.includes(editing.location)
                    ? editing.location
                    : OTHER_LOCATION
                }
                onValueChange={(v) =>
                  onChange({
                    ...editing,
                    location: v === OTHER_LOCATION ? '' : v,
                  })
                }
              >
                <SelectTrigger
                  id="event-location"
                  className="border-border bg-canvas"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-surface text-foreground">
                  {LOCATION_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_LOCATION}>
                    Other (type your own)
                  </SelectItem>
                </SelectContent>
              </Select>
              {!LOCATION_OPTIONS.includes(editing.location) && (
                <Input
                  aria-label="Custom location"
                  value={editing.location}
                  onChange={(e) =>
                    onChange({ ...editing, location: e.target.value })
                  }
                  placeholder="Enter the location"
                  className="mt-2 border-border bg-canvas"
                />
              )}
            </div>
            <Button
              className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft"
              disabled={saving}
              onClick={onSave}
            >
              {saving ? 'Saving…' : 'Save Event'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
