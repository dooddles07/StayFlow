import { CircleCheckIcon, InfoIcon, OctagonXIcon, XIcon } from 'lucide-react'
import { dismissToast, useToasts } from '#/lib/toast'
import type { ToastVariant } from '#/lib/toast'
import { cn } from '#/lib/utils'

const ICONS: Record<ToastVariant, typeof CircleCheckIcon> = {
  success: CircleCheckIcon,
  error: OctagonXIcon,
  info: InfoIcon,
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success:
    'border-emerald-500/30 bg-emerald-950 text-emerald-100 [&_svg]:text-emerald-400',
  error:
    'border-destructive/30 bg-destructive/10 text-destructive-foreground [&_svg]:text-destructive',
  info: 'border-border bg-popover text-popover-foreground [&_svg]:text-accent-indigo-soft',
}

export function ToastViewport() {
  const toasts = useToasts()

  return (
    // aria-live sits on this container, which is mounted for the life of the
    // app, rather than only on each toast. A live region has to already exist in
    // the DOM when content is inserted into it — a region that appears at the
    // same moment as its content is routinely missed by screen readers, which
    // is what happened when role="status" was on the toast alone.
    <section
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-4 z-[999999] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div
            key={t.id}
            // Errors interrupt; everything else waits for a pause in speech.
            role={t.variant === 'error' ? 'alert' : 'status'}
            className={cn(
              'animate-fade-in pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur',
              VARIANT_CLASSES[t.variant],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p>{t.message}</p>
              {t.description && (
                <p className="mt-0.5 text-xs opacity-80">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )
      })}
    </section>
  )
}
