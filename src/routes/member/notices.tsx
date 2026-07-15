import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { PageHeader } from '#/components/stayflow/page-header'
import { NoticeItem } from '#/components/stayflow/notice-item'
import { EmptyState } from '#/components/stayflow/empty-state'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useMockStore } from '#/lib/store/mock-store'
import { Megaphone } from 'lucide-react'
import type { NoticeCategory } from '#/lib/mock/types'

export const Route = createFileRoute('/member/notices')({
  head: () => ({ meta: [{ title: 'Notices — StayFlow Member' }] }),
  component: NoticesPage,
})

const categories: (NoticeCategory | 'All')[] = ['All', 'Important', 'Maintenance', 'Events', 'General']

function NoticesPage() {
  const { state } = useMockStore()
  const [category, setCategory] = React.useState<(typeof categories)[number]>('All')

  const notices = [...state.notices]
    .filter((n) => category === 'All' || n.category === category)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.postedAt.localeCompare(a.postedAt))

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Community" title="Notices" description="Announcements and updates from StayFlow management." />

      <Tabs value={category} onValueChange={(v) => setCategory(v as typeof category)} className="mb-6">
        <TabsList className="bg-surface">
          {categories.map((c) => (
            <TabsTrigger key={c} value={c} className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {notices.length === 0 ? (
        <EmptyState icon={Megaphone} title="No notices in this category" />
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <NoticeItem key={notice.id} notice={notice} />
          ))}
        </div>
      )}
    </div>
  )
}
