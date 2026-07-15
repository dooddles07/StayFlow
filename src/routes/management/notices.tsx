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
import { useMockStore, genId } from '#/lib/store/mock-store'
import { CURRENT_MANAGER_NAME } from '#/lib/session'
import type { Notice, NoticeCategory } from '#/lib/mock/types'

export const Route = createFileRoute('/management/notices')({
  head: () => ({ meta: [{ title: 'Notices — StayFlow Management' }] }),
  component: ManagementNoticesPage,
})

const categories: NoticeCategory[] = ['Important', 'Maintenance', 'Events', 'General']

function ManagementNoticesPage() {
  const { state, dispatch } = useMockStore()
  const [editing, setEditing] = React.useState<Notice | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Notice | null>(null)

  function newNotice(): Notice {
    return { id: genId('ntc'), title: '', category: 'General', body: '', postedAt: new Date().toISOString(), postedBy: CURRENT_MANAGER_NAME, pinned: false }
  }

  function save(notice: Notice) {
    const exists = state.notices.some((n) => n.id === notice.id)
    dispatch({ type: exists ? 'UPDATE_NOTICE' : 'ADD_NOTICE', payload: notice })
    setEditing(null)
    toast.success(exists ? 'Notice updated' : 'Notice published')
  }

  function confirmDelete() {
    if (!deleteTarget) return
    dispatch({ type: 'DELETE_NOTICE', payload: { id: deleteTarget.id } })
    toast.success('Notice removed')
    setDeleteTarget(null)
  }

  const sorted = [...state.notices].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.postedAt.localeCompare(a.postedAt))

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Community"
        title="Notices"
        description="Compose and manage announcements shown to residents."
        actions={
          <Button className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => setEditing(newNotice())}>
            <Plus className="size-4" /> New Notice
          </Button>
        }
      />

      <div className="space-y-3">
        {sorted.map((notice) => (
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
              <Button size="icon" variant="ghost" className="size-7 text-muted-text hover:text-foreground" onClick={() => setEditing(notice)}>
                <Pencil className="size-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="size-7 text-rose-400 hover:bg-rose-500/10" onClick={() => setDeleteTarget(notice)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{state.notices.some((n) => n.id === editing?.id) ? 'Edit Notice' : 'New Notice'}</SheetTitle>
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
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => save(editing)}>
                Publish Notice
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
