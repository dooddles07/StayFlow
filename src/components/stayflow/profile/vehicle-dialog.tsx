import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { addVehicle, updateVehicle } from '#/lib/api/resident'
import type { ResidentProfile, ResidentVehicle } from '#/lib/api/resident'
import { errText } from './profile-helpers'

// --- Vehicle add/edit dialog ---
export function VehicleDialog({
  initial,
  onSaved,
  trigger,
}: {
  initial?: ResidentVehicle
  onSaved: (p: ResidentProfile) => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [make, setMake] = React.useState('')
  const [model, setModel] = React.useState('')
  const [plate, setPlate] = React.useState('')
  const [color, setColor] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  // Mirrors busy but checked/updated synchronously — two clicks before React re-renders
  // (and disables the button) would both read the same stale false and both fire.
  const busyRef = React.useRef(false)

  React.useEffect(() => {
    if (!open) return
    setMake(initial?.make ?? '')
    setModel(initial?.model ?? '')
    setPlate(initial?.plate ?? '')
    setColor(initial?.color ?? '')
  }, [open, initial])

  async function submit() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const payload = { make, model, plate, color }
      const profile = initial
        ? await updateVehicle(initial.id, payload)
        : await addVehicle(payload)
      onSaved(profile)
      toast.success(initial ? 'Vehicle updated' : 'Vehicle added')
      setOpen(false)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="border-border bg-surface">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit vehicle' : 'Add vehicle'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label
              htmlFor="veh-make"
              className="mb-1.5 text-xs text-muted-text"
            >
              Make
            </Label>
            <Input
              id="veh-make"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="border-border bg-canvas"
            />
          </div>
          <div>
            <Label
              htmlFor="veh-model"
              className="mb-1.5 text-xs text-muted-text"
            >
              Model
            </Label>
            <Input
              id="veh-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border-border bg-canvas"
            />
          </div>
          <div>
            <Label
              htmlFor="veh-plate"
              className="mb-1.5 text-xs text-muted-text"
            >
              Plate
            </Label>
            <Input
              id="veh-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              className="border-border bg-canvas"
            />
          </div>
          <div>
            <Label
              htmlFor="veh-color"
              className="mb-1.5 text-xs text-muted-text"
            >
              Color
            </Label>
            <Input
              id="veh-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="border-border bg-canvas"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-border">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
