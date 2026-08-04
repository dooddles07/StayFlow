import { Copy } from 'lucide-react'
import { toast } from '#/lib/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

export function UserActionDialogs({
  deleteTarget,
  onDeleteOpenChange,
  deleting,
  onConfirmDelete,
  confirmLoginTarget,
  onLoginOpenChange,
  creatingLogin,
  onConfirmCreateLogin,
  revealedLogin,
  onRevealedOpenChange,
}: {
  deleteTarget: { kind: 'resident' | 'staff'; id: string; name: string } | null
  onDeleteOpenChange: (open: boolean) => void
  deleting: boolean
  onConfirmDelete: () => void
  confirmLoginTarget: { id: string; name: string } | null
  onLoginOpenChange: (open: boolean) => void
  creatingLogin: boolean
  onConfirmCreateLogin: () => void
  revealedLogin: { name: string; email: string; tempPassword: string } | null
  onRevealedOpenChange: (open: boolean) => void
}) {
  return (
    <>
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && onDeleteOpenChange(open)}
      >
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-rose-500 text-white hover:bg-rose-600"
              onClick={onConfirmDelete}
            >
              {deleting ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmLoginTarget}
        onOpenChange={(open) => !open && onLoginOpenChange(open)}
      >
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Create a login for {confirmLoginTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This generates a one-time temporary password. You'll need to relay
              it to them in person — it won't be shown again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={creatingLogin}
              className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
              onClick={onConfirmCreateLogin}
            >
              {creatingLogin ? 'Creating…' : 'Create Login'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!revealedLogin}
        onOpenChange={(open) => !open && onRevealedOpenChange(open)}
      >
        <DialogContent className="border-border bg-surface text-foreground">
          <DialogHeader>
            <DialogTitle>Login created</DialogTitle>
          </DialogHeader>
          {revealedLogin && (
            <div className="space-y-4">
              <p className="text-sm text-muted-text">
                Give these credentials to{' '}
                <span className="font-medium text-foreground">
                  {revealedLogin.name}
                </span>{' '}
                in person. The password is shown once — it can't be retrieved
                again after you close this.
              </p>
              <div className="space-y-3 rounded-xl border border-border bg-canvas p-3">
                <div>
                  <Label className="mb-1 block text-[11px] text-muted-text">
                    Email
                  </Label>
                  <p className="text-sm font-medium text-foreground">
                    {revealedLogin.email}
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="revealed-temp-password"
                    className="mb-1 block text-[11px] text-muted-text"
                  >
                    Temporary password
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="revealed-temp-password"
                      readOnly
                      value={revealedLogin.tempPassword}
                      className="border-border bg-surface font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 border-border"
                      aria-label="Copy password"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          revealedLogin.tempPassword,
                        )
                        toast.success('Password copied')
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft">
                Done
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
