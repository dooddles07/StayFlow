import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { PageHeader } from '#/components/stayflow/page-header'
import { FacilityCard } from '#/components/stayflow/facility-card'
import { EmptyState } from '#/components/stayflow/empty-state'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useMockStore } from '#/lib/store/mock-store'
import { Waves } from 'lucide-react'
import type { FacilityCategory } from '#/lib/mock/types'

export const Route = createFileRoute('/member/facilities/')({
  head: () => ({ meta: [{ title: 'Facilities — StayFlow Member' }] }),
  component: FacilitiesList,
})

const categories: (FacilityCategory | 'All')[] = ['All', 'Wellness', 'Sports', 'Entertainment', 'Recreation', 'Function']

function FacilitiesList() {
  const { state } = useMockStore()
  const [category, setCategory] = React.useState<(typeof categories)[number]>('All')

  const filtered = category === 'All' ? state.facilities : state.facilities.filter((f) => f.category === category)

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Amenities"
        title="Facilities"
        description="Browse and reserve community amenities, from the sky pool to the private screening room."
      />

      <Tabs value={category} onValueChange={(v) => setCategory(v as typeof category)} className="mb-6">
        <TabsList className="bg-surface">
          {categories.map((c) => (
            <TabsTrigger key={c} value={c} className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState icon={Waves} title="No facilities in this category" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      )}
    </div>
  )
}
