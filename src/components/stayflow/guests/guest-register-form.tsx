import { UserPlus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { TIME_OF_DAY_OPTIONS, toDateKey } from '#/lib/booking-slots'

interface GuestRegisterFormProps {
  days: Date[]
  name: string
  purpose: string
  vehiclePlate: string
  arrivalDate: Date
  arrivalTime: string
  submitting: boolean
  disabled: boolean
  onNameChange: (v: string) => void
  onPurposeChange: (v: string) => void
  onVehiclePlateChange: (v: string) => void
  onArrivalDateChange: (d: Date) => void
  onArrivalTimeChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function GuestRegisterForm({
  days,
  name,
  purpose,
  vehiclePlate,
  arrivalDate,
  arrivalTime,
  submitting,
  disabled,
  onNameChange,
  onPurposeChange,
  onVehiclePlateChange,
  onArrivalDateChange,
  onArrivalTimeChange,
  onSubmit,
}: GuestRegisterFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="animate-fade-in space-y-4 rounded-2xl border border-border bg-surface p-5 lg:col-span-1"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserPlus className="size-4 text-accent-gold" />
        Register a Guest
      </h2>
      <div>
        <Label htmlFor="guest-name" className="mb-1.5 text-xs text-muted-text">
          Guest name
        </Label>
        <Input
          id="guest-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          className="border-border bg-canvas"
        />
      </div>
      <div>
        <Label htmlFor="purpose" className="mb-1.5 text-xs text-muted-text">
          Purpose of visit
        </Label>
        <Input
          id="purpose"
          value={purpose}
          onChange={(e) => onPurposeChange(e.target.value)}
          placeholder="Personal visit, delivery…"
          className="border-border bg-canvas"
        />
      </div>
      <div>
        <Label htmlFor="plate" className="mb-1.5 text-xs text-muted-text">
          Vehicle plate (optional)
        </Label>
        <Input
          id="plate"
          value={vehiclePlate}
          onChange={(e) => onVehiclePlateChange(e.target.value)}
          className="border-border bg-canvas"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label
            htmlFor="arrival-date"
            className="mb-1.5 text-xs text-muted-text"
          >
            Arrival date
          </Label>
          <select
            id="arrival-date"
            value={toDateKey(arrivalDate)}
            onChange={(e) =>
              onArrivalDateChange(
                days.find((d) => toDateKey(d) === e.target.value) ?? days[0],
              )
            }
            className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground"
          >
            {days.map((d) => (
              <option key={toDateKey(d)} value={toDateKey(d)}>
                {d.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label
            htmlFor="arrival-time"
            className="mb-1.5 text-xs text-muted-text"
          >
            Arrival time
          </Label>
          <select
            id="arrival-time"
            value={arrivalTime}
            onChange={(e) => onArrivalTimeChange(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground"
          >
            {TIME_OF_DAY_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button
        type="submit"
        disabled={submitting || disabled}
        className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft"
      >
        {submitting ? 'Generating…' : 'Generate Pass'}
      </Button>
    </form>
  )
}
