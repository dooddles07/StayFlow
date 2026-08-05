import * as React from 'react'
import { X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import type { ProfileTabProps } from './profile-helpers'

export function PreferencesTab({
  form,
  setForm,
  saving,
  dirty,
  save,
}: ProfileTabProps) {
  const [dietaryInput, setDietaryInput] = React.useState('')
  const { preferences } = form

  // Case-insensitive de-dupe, so "Vegetarian" and "vegetarian" do not both end
  // up on the kitchen's list for the same resident.
  function addDietary() {
    const value = dietaryInput.trim()
    if (!value) return
    const exists = preferences.dietary.some(
      (d) => d.toLowerCase() === value.toLowerCase(),
    )
    if (!exists) {
      setForm({
        ...form,
        preferences: {
          ...preferences,
          dietary: [...preferences.dietary, value],
        },
      })
    }
    setDietaryInput('')
  }

  function removeDietary(tag: string) {
    setForm({
      ...form,
      preferences: {
        ...preferences,
        dietary: preferences.dietary.filter((d) => d !== tag),
      },
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Push notifications
          </p>
          <p className="text-xs text-muted-text">
            Booking updates, guest arrivals, and reminders.
          </p>
        </div>
        <Switch
          checked={preferences.notifications}
          onCheckedChange={(checked) =>
            setForm({
              ...form,
              preferences: { ...preferences, notifications: checked },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Community newsletter
          </p>
          <p className="text-xs text-muted-text">
            Monthly digest of events and announcements.
          </p>
        </div>
        <Switch
          checked={preferences.newsletter}
          onCheckedChange={(checked) =>
            setForm({
              ...form,
              preferences: { ...preferences, newsletter: checked },
            })
          }
        />
      </div>
      <div>
        <Label
          htmlFor="dietary-input"
          className="mb-1.5 text-xs text-muted-text"
        >
          Dietary preferences
        </Label>
        {preferences.dietary.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {preferences.dietary.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-accent-indigo/15 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeDietary(tag)}
                  aria-label={`Remove ${tag}`}
                  className="-m-1.5 flex size-7 items-center justify-center rounded-full text-muted-text transition-colors hover:text-red-500"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            id="dietary-input"
            value={dietaryInput}
            placeholder="e.g. Vegetarian, Gluten-free"
            onChange={(e) => setDietaryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addDietary()
              }
            }}
            className="border-border bg-canvas"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addDietary}
            className="border-border"
          >
            Add
          </Button>
        </div>
      </div>
      <Button
        onClick={() =>
          save(
            {
              notifications: preferences.notifications,
              newsletter: preferences.newsletter,
              dietary: preferences.dietary,
            },
            'Preferences saved',
            [],
          )
        }
        disabled={saving || !dirty}
        className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </div>
  )
}
