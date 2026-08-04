import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import * as React from 'react'
import { cn } from '#/lib/utils'

interface SectionHeaderProps {
  title: string
  description?: string
  viewAllHref?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  description,
  viewAllHref,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn('mb-4 flex items-center justify-between gap-3', className)}
    >
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-text">{description}</p>
        )}
      </div>
      {action}
      {viewAllHref && (
        <Link
          to={viewAllHref}
          className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-accent-indigo-soft transition-colors hover:text-accent-gold"
        >
          View all
          <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  )
}
