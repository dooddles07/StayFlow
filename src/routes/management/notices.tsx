import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Pencil, Pin, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { ApiError } from '#/lib/api/client'
import { createNotice, deleteNotice, getNotices, updateNotice } from '#/lib/api/notice'
import type { Notice, NoticeCategory } from '#/lib/mock/types'

export const Route = createFileRoute('/management/notices')({
  head: () => ({ meta: [{ title: 'Notices — StayFlow Management' }] }),
  component: ManagementNoticesPage,
})

const categories: NoticeCategory[] = ['Important', 'Maintenance', 'Events', 'General']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

// Draft holds only the editable fields; `id` present means edit, absent means create.
interface NoticeDraft {
  id?: string
  title: string
  category: NoticeCategory
  body: string
  pinned: boolean
}

function ManagementNoticesPage() {
  const [notices, setNotices] = React.useState<Notice[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [editing, setEditing] = React.useState<NoticeDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Notice | null>(null)
  const [saving, setSaving] = React.useState(false)
  // Mirror saving/delete-in-flight but checked/updated synchronously — two clicks
  // before React re-renders (and disables the button) would both read the same
  // stale state and both fire; a ref is always current.
  const savingRef = React.useRef(false)
  const deletingRef = React.useRef(false)

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    getNotices()
      .then((data) => {
        if (!active) return
        setNotices(data)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => load(), [load])

  function newDraft(): NoticeDraft {
    return { title: '', category: 'General', body: '', pinned: false }
  }

  async function save() {
    if (!editing || savingRef.current) return
    if (editing.title.trim() === '' || editing.body.trim() === '') {
      toast.error('Title and body are required.')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const payload = {
        title: editing.title.trim(),
        category: editing.category,
        body: editing.body.trim(),
        pinned: editing.pinned,
      }
      const saved = editing.id ? await updateNotice(editing.id, payload) : await createNotice(payload)
      setNotices((prev) => {
        const exists = prev.some((n) => n.id === saved.id)
        const next = exists ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev]
        return next.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.postedAt.localeCompare(a.postedAt))
      })
      toast.success(editing.id ? 'Notice updated' : 'Notice published')
      setEditing(null)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deletingRef.current) return
    deletingRef.current = true
    const id = deleteTarget.id
    setDeleteTarget(null)
    try {
      await deleteNotice(id)
      setNotices((prev) => prev.filter((n) => n.id !== id))
      toast.success('Notice removed')
    } catch (err) {
      toast.error(errText(err))
    } finally {
      deletingRef.current = false
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Community"
        title="Notices"
        description="Compose and manage announcements shown to residents."
        actions={
          <Button className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setEditing(newDraft())}>
            <Plus className="size-4" /> New Notice
          </Button>
        }
      />

      {status === 'loading' ? (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load notices right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Retry
          </Button>
        </div>
      ) : notices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-text">
          No notices yet. Publish your first announcement.
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-medium text-muted-text">{notice.category}</span>
                  {notice.pinned && <Pin className="size-3 fill-current text-accent-gold" />}
                </div>
                <p className="text-sm font-medium text-foreground">{notice.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-text">{notice.body}</p>
                <p className="mt-1 text-[11px] text-muted-text/70">{notice.postedBy}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-text hover:text-foreground"
                  aria-label={`Edit ${notice.title}`}
                  onClick={() =>
                    setEditing({ id: notice.id, title: notice.title, category: notice.category, body: notice.body, pinned: notice.pinned })
                  }
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-rose-400 hover:bg-rose-500/10"
                  aria-label={`Remove ${notice.title}`}
                  onClick={() => setDeleteTarget(notice)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{editing?.id ? 'Edit Notice' : 'New Notice'}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 px-4 pb-6">
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Body</Label>
                <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className="border-border bg-canvas" rows={4} />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Category</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as NoticeCategory })}>
                  <SelectTrigger className="border-border bg-canvas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-canvas px-3.5 py-3">
                <Label className="text-xs text-muted-text">Pin to top</Label>
                <Switch checked={editing.pinned} onCheckedChange={(checked) => setEditing({ ...editing, pinned: checked })} />
              </div>
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" disabled={saving} onClick={save}>
                {saving ? 'Publishing…' : editing.id ? 'Save Changes' : 'Publish Notice'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this notice?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-500 text-white hover:bg-rose-600" onClick={confirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
