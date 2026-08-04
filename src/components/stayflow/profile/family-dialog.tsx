import * as React from 'react'
import { toast } from '#/lib/toast'
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
import { addFamilyMember, updateFamilyMember } from '#/lib/api/resident'
import type { ResidentFamilyMember, ResidentProfile } from '#/lib/api/resident'
import { errText } from './profile-helpers'

// --- Family add/edit dialog ---
export function FamilyDialog({
  initial,
  onSaved,
  trigger,
}: {
  initial?: ResidentFamilyMember
  onSaved: (p: ResidentProfile) => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [relation, setRelation] = React.useState('')
  const [age, setAge] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  // Mirrors busy but checked/updated synchronously — two clicks before React re-renders
  // (and disables the button) would both read the same stale false and both fire.
  const busyRef = React.useRef(false)

  React.useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setRelation(initial?.relation ?? '')
    setAge(initial ? String(initial.age) : '')
  }, [open, initial])

  async function submit() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const payload = { name, relation, age: Number(age) }
      const profile = initial
        ? await updateFamilyMember(initial.id, payload)
        : await addFamilyMember(payload)
      onSaved(profile)
      toast.success(initial ? 'Family member updated' : 'Family member added')
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
          <DialogTitle>
            {initial ? 'Edit family member' : 'Add family member'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="fam-name"
              className="mb-1.5 text-xs text-muted-text"
            >
              Full name
            </Label>
            <Input
              id="fam-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-border bg-canvas"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="fam-relation"
                className="mb-1.5 text-xs text-muted-text"
              >
                Relation
              </Label>
              <Input
                id="fam-relation"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="fam-age"
                className="mb-1.5 text-xs text-muted-text"
              >
                Age
              </Label>
              <Input
                id="fam-age"
                type="number"
                min={0}
                max={130}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="border-border bg-canvas"
              />
            </div>
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
