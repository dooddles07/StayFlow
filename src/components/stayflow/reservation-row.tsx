import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { StatusPill  } from './status-pill'
import type {PillTone} from './status-pill';
import { cn } from '#/lib/utils'

interface ReservationRowProps {
  date: string
  title: string
  subtitle: string
  status: string
  statusTone?: PillTone
  meta?: string
  action?: React.ReactNode
  className?: string
}

export function ReservationRow({ date, title, subtitle, status, statusTone, meta, action, className }: ReservationRowProps) {
  const parsed = parseISO(date)
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:border-accent-indigo/30 sm:p-4',
        className,
      )}
    >
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent-indigo/10">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-accent-gold">{format(parsed, 'MMM')}</span>
        <span className="text-base font-semibold leading-none text-foreground">{format(parsed, 'd')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-text">{subtitle}</p>
        {meta && <p className="mt-0.5 truncate text-[11px] text-muted-text/70">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusPill status={status} tone={statusTone} />
        {action}
      </div>
    </div>
  )
}
