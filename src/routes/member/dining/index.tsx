import { createFileRoute, Link } from '@tanstack/react-router'
import { MapPin, Star } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { useMockStore } from '#/lib/store/mock-store'

export const Route = createFileRoute('/member/dining/')({
  head: () => ({ meta: [{ title: 'Dining — StayFlow Member' }] }),
  component: DiningList,
})

function DiningList() {
  const { state } = useMockStore()

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Culinary"
        title="Dining"
        description="Reserve a table at one of our four resident restaurants."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.restaurants.map((restaurant) => (
          <Link
            key={restaurant.id}
            to="/member/dining/$id"
            params={{ id: restaurant.id }}
            className="group animate-fade-in flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:border-accent-indigo/40"
          >
            <div className="relative h-36 w-full bg-surface-hover">
              <img
                src={restaurant.image}
                alt={restaurant.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
              <span className="absolute right-3 top-3 rounded-full bg-canvas/60 px-2 py-1 text-[11px] font-medium text-accent-gold backdrop-blur">
                {restaurant.priceRange}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{restaurant.name}</p>
                <span className="flex shrink-0 items-center gap-1 text-xs text-accent-gold">
                  <Star className="size-3 fill-current" />
                  {restaurant.rating}
                </span>
              </div>
              <p className="text-xs text-muted-text">{restaurant.cuisine}</p>
              <p className="line-clamp-2 text-xs text-muted-text">{restaurant.description}</p>
              <div className="mt-auto flex items-center gap-1 pt-1 text-[11px] text-muted-text/80">
                <MapPin className="size-3" />
                <span className="truncate">{restaurant.location}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
