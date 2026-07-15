import { Link } from '@tanstack/react-router'
import { MapPin, Star } from 'lucide-react'
import { StatusPill } from './status-pill'
import type { Facility } from '#/lib/mock/types'
import { cn } from '#/lib/utils'

export function FacilityCard({ facility, className }: { facility: Facility; className?: string }) {
  return (
    <Link
      to="/member/facilities/$id"
      params={{ id: facility.id }}
      className={cn(
        'group animate-fade-in flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:border-accent-indigo/40',
        className,
      )}
    >
      <div className="relative h-36 w-full bg-surface-hover">
        <img
          src={facility.image}
          alt={facility.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        <div className="absolute right-3 top-3">
          <StatusPill status={facility.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{facility.name}</p>
          <span className="flex shrink-0 items-center gap-1 text-xs text-accent-gold">
            <Star className="size-3 fill-current" />
            {facility.rating}
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-muted-text">{facility.description}</p>
        <div className="mt-auto flex items-center gap-1 pt-1 text-[11px] text-muted-text/80">
          <MapPin className="size-3" />
          <span className="truncate">{facility.location}</span>
        </div>
      </div>
    </Link>
  )
}
