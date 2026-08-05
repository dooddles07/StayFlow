import { format, formatDistanceToNowStrict } from 'date-fns'
import { Pin } from 'lucide-react'
import { cn } from '#/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import type { Notice, NoticeCategory } from '#/lib/domain/types'

const categoryTone: Record<NoticeCategory, string> = {
  Important: 'bg-rose-500/15 text-rose-400 ring-rose-500/25',
  Maintenance: 'bg-accent-gold/15 text-accent-gold ring-accent-gold/30',
  Events: 'bg-accent-indigo/15 text-accent-indigo-soft ring-accent-indigo/30',
  General: 'bg-surface-hover text-muted-text ring-border',
}

function CategoryBadge({ category }: { category: NoticeCategory }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
        categoryTone[category],
      )}
    >
      {category}
    </span>
  )
}

// Summary card that opens a dialog with the full, untruncated notice.
export function NoticeCard({
  notice,
  isNew = false,
}: {
  notice: Notice
  isNew?: boolean
}) {
  const posted = new Date(notice.postedAt)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full animate-fade-in rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent-indigo/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo/50"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CategoryBadge category={notice.category} />
              {isNew && (
                <span className="rounded-full bg-accent-indigo px-2 py-0.5 text-[10px] font-semibold text-white">
                  New
                </span>
              )}
            </div>
            {notice.pinned && (
              <Pin className="size-3.5 fill-current text-accent-gold" />
            )}
          </div>
          <p className="text-sm font-medium text-foreground">{notice.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-text">
            {notice.body}
          </p>
          <p className="mt-2 text-[11px] text-muted-text/70">
            {notice.postedBy} ·{' '}
            {formatDistanceToNowStrict(posted, { addSuffix: true })}
          </p>
        </button>
      </DialogTrigger>
      <DialogContent className="border-border bg-surface">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2">
            <CategoryBadge category={notice.category} />
            {notice.pinned && (
              <Pin className="size-3.5 fill-current text-accent-gold" />
            )}
          </div>
          <DialogTitle>{notice.title}</DialogTitle>
          <DialogDescription className="text-muted-text">
            {notice.postedBy} · {format(posted, 'PPp')}
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
          {notice.body}
        </p>
      </DialogContent>
    </Dialog>
  )
}
