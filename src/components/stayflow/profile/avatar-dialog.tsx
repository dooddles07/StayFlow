import * as React from 'react'
import { toast } from 'sonner'
import { Camera, Shuffle } from 'lucide-react'
import { UserAvatar } from '#/components/stayflow/user-avatar'
import { Button } from '#/components/ui/button'
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
import { DICEBEAR_STYLES, avatarUrl } from '#/lib/avatar'
import { cn } from '#/lib/utils'
import { updateMyProfile } from '#/lib/api/resident'
import type { ResidentProfile } from '#/lib/api/resident'
import { errText } from './profile-helpers'

// --- Avatar picker (DiceBear) ---
export function AvatarDialog({
  seed,
  style,
  name,
  onSaved,
}: {
  seed: string
  style: string | null
  name: string
  onSaved: (p: ResidentProfile) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [draftStyle, setDraftStyle] = React.useState<string | null>(style)
  const [draftSeed, setDraftSeed] = React.useState(seed)
  const [busy, setBusy] = React.useState(false)
  // Mirrors busy but checked/updated synchronously — two clicks before React re-renders
  // (and disables the button) would both read the same stale false and both fire.
  const busyRef = React.useRef(false)

  React.useEffect(() => {
    if (!open) return
    setDraftStyle(style)
    setDraftSeed(seed || name)
  }, [open, seed, style, name])

  async function submit() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const profile = await updateMyProfile({
        avatarSeed: draftSeed,
        avatarStyle: draftStyle,
      })
      onSaved(profile)
      toast.success('Avatar updated')
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 border-border">
          <Camera className="size-3.5" /> Change
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-surface">
        <DialogHeader>
          <DialogTitle>Choose your avatar</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <UserAvatar
              seed={draftSeed}
              style={draftStyle}
              name={name}
              className="size-16"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDraftSeed(Math.random().toString(36).slice(2, 10))
              }
              className="gap-1.5 border-border"
            >
              <Shuffle className="size-3.5" /> Shuffle
            </Button>
          </div>
          <div>
            <Label className="mb-2 block text-xs text-muted-text">Style</Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              <button
                type="button"
                onClick={() => setDraftStyle(null)}
                aria-pressed={draftStyle === null}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl border bg-canvas text-[10px] font-semibold',
                  draftStyle === null
                    ? 'border-accent-gold text-accent-gold'
                    : 'border-border text-muted-text',
                )}
              >
                ABC
              </button>
              {DICEBEAR_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraftStyle(s)}
                  aria-label={s}
                  aria-pressed={draftStyle === s}
                  className={cn(
                    'aspect-square overflow-hidden rounded-xl border bg-canvas',
                    draftStyle === s
                      ? 'border-accent-gold ring-1 ring-accent-gold/40'
                      : 'border-border',
                  )}
                >
                  <img
                    src={avatarUrl(s, draftSeed)}
                    alt=""
                    className="size-full"
                  />
                </button>
              ))}
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
