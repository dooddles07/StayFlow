import { QrCode } from '#/components/stayflow/qr-code'
import { StatusPill } from '#/components/stayflow/status-pill'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog'
import type { GuestView } from '#/lib/api/guest'
import { TIME_OF_DAY_OPTIONS, toDateKey } from '#/lib/booking-slots'

interface GuestDetailDialogProps {
  guest: GuestView | null
  editing: boolean
  days: Date[]
  editPurpose: string
  editPlate: string
  editDate: Date
  editTime: string
  savingEdit: boolean
  canceling: boolean
  onClose: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onEditPurposeChange: (v: string) => void
  onEditPlateChange: (v: string) => void
  onEditDateChange: (d: Date) => void
  onEditTimeChange: (v: string) => void
  onSaveEdit: () => void
  onCancelGuest: () => void
}

// Once a guest has arrived (or left), there's nothing to cancel or edit — the
// visit already happened.
function canModify(guest: GuestView | null) {
  return guest?.status === 'pending' || guest?.status === 'approved'
}

export function GuestDetailDialog({
  guest,
  editing,
  days,
  editPurpose,
  editPlate,
  editDate,
  editTime,
  savingEdit,
  canceling,
  onClose,
  onStartEdit,
  onCancelEdit,
  onEditPurposeChange,
  onEditPlateChange,
  onEditDateChange,
  onEditTimeChange,
  onSaveEdit,
  onCancelGuest,
}: GuestDetailDialogProps) {
  return (
    <Dialog open={!!guest} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-border bg-surface text-foreground">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit Guest Details' : 'Guest Pass'}
          </DialogTitle>
        </DialogHeader>
        {guest && editing ? (
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="edit-purpose"
                className="mb-1.5 text-xs text-muted-text"
              >
                Purpose of visit
              </Label>
              <Input
                id="edit-purpose"
                value={editPurpose}
                onChange={(e) => onEditPurposeChange(e.target.value)}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="edit-plate"
                className="mb-1.5 text-xs text-muted-text"
              >
                Vehicle plate (optional)
              </Label>
              <Input
                id="edit-plate"
                value={editPlate}
                onChange={(e) => onEditPlateChange(e.target.value)}
                className="border-border bg-canvas"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="edit-date"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Arrival date
                </Label>
                <select
                  id="edit-date"
                  value={toDateKey(editDate)}
                  onChange={(e) =>
                    onEditDateChange(
                      days.find((d) => toDateKey(d) === e.target.value) ??
                        days[0],
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
                  htmlFor="edit-time"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Arrival time
                </Label>
                <select
                  id="edit-time"
                  value={editTime}
                  onChange={(e) => onEditTimeChange(e.target.value)}
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={onCancelEdit}
              >
                Cancel
              </Button>
              <Button
                disabled={savingEdit}
                className="flex-1 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
                onClick={onSaveEdit}
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : guest ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-canvas p-6 text-center">
            <QrCode value={guest.passNumber} />
            <div>
              <p className="text-base font-semibold text-foreground">
                {guest.name}
              </p>
              <p className="text-xs text-muted-text">{guest.purpose}</p>
            </div>
            <div className="w-full border-t border-border pt-3 text-xs text-muted-text">
              <p>
                Pass Number:{' '}
                <span className="font-medium text-accent-gold">
                  {guest.passNumber}
                </span>
              </p>
              <p className="mt-1">
                {guest.arrivalDate.slice(0, 10)} at {guest.arrivalTime}
              </p>
            </div>
            <StatusPill status={guest.status} />
            {canModify(guest) && (
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={onStartEdit}
                >
                  Edit Details
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={canceling}
                      className="flex-1 border-border text-rose-400 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      {canceling ? 'Cancelling…' : 'Cancel'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-border bg-surface">
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Cancel this guest pass?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {guest.name} will no longer be expected, and this pass
                        number stops working. This can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-border">
                        Keep it
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-rose-600 text-white hover:bg-rose-700"
                        onClick={onCancelGuest}
                      >
                        Cancel Registration
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
