import { createFileRoute } from '@tanstack/react-router'
import { CalendarPlus, CloudSun, Sunset, UserPlus, UtensilsCrossed, Waves } from 'lucide-react'
import { SectionHeader } from '#/components/stayflow/section-header'
import { ReservationRow } from '#/components/stayflow/reservation-row'
import { FacilityCard } from '#/components/stayflow/facility-card'
import { NoticeItem } from '#/components/stayflow/notice-item'
import { QuickActionCard } from '#/components/stayflow/quick-action-card'
import { EmptyState } from '#/components/stayflow/empty-state'
import { useMockStore } from '#/lib/store/mock-store'
import { CURRENT_RESIDENT_ID } from '#/lib/session'
import { getResidentById } from '#/lib/mock/residents'

export const Route = createFileRoute('/member/')({
  head: () => ({ meta: [{ title: 'Dashboard — StayFlow Member' }] }),
  component: MemberDashboard,
})

function MemberDashboard() {
  const { state } = useMockStore()
  const resident = getResidentById(CURRENT_RESIDENT_ID)
  const firstName = resident?.name.split(' ')[0] ?? 'Resident'

  const upcomingBookings = state.bookings
    .filter((b) => b.residentId === CURRENT_RESIDENT_ID && b.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  const featuredFacilities = state.facilities.filter((f) => f.status === 'open').slice(0, 3)
  const topNotices = [...state.notices].sort((a, b) => Number(b.pinned) - Number(a.pinned)).slice(0, 3)

  return (
    <div className="mx-auto max-w-7xl">
      <div className="animate-fade-in mb-6 flex flex-col justify-between gap-6 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-hover p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-gold">Welcome back</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Good evening, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-text">{resident?.unit} · {resident?.tier} Member</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-canvas/40 px-4 py-3">
            <CloudSun className="size-5 text-accent-gold" />
            <div>
              <p className="text-sm font-medium text-foreground">72°F · Clear</p>
              <p className="text-[11px] text-muted-text">Perfect pool weather</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-canvas/40 px-4 py-3">
            <Sunset className="size-5 text-accent-gold" />
            <div>
              <p className="text-sm font-medium text-foreground">7:42 PM</p>
              <p className="text-[11px] text-muted-text">Sunset tonight</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickActionCard icon={Waves} label="Book a Facility" description="Pool, gym & more" to="/member/facilities" />
        <QuickActionCard icon={UtensilsCrossed} label="Reserve Dining" description="4 restaurants" to="/member/dining" />
        <QuickActionCard icon={UserPlus} label="Register Guest" description="Get a pass" to="/member/guests" />
        <QuickActionCard icon={CalendarPlus} label="Browse Events" description="This week" to="/member/events" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader title="Upcoming Reservations" viewAllHref="/member/facilities" />
          {upcomingBookings.length === 0 ? (
            <EmptyState icon={Waves} title="No upcoming reservations" description="Book a facility to see it here." />
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((booking) => {
                const facility = state.facilities.find((f) => f.id === booking.facilityId)
                return (
                  <ReservationRow
                    key={booking.id}
                    date={booking.date}
                    title={facility?.name ?? 'Facility'}
                    subtitle={booking.timeSlot}
                    status={booking.status}
                    meta={`Party of ${booking.partySize}`}
                  />
                )
              })}
            </div>
          )}

          <div className="mt-8">
            <SectionHeader title="Featured Facilities" viewAllHref="/member/facilities" />
            <div className="grid gap-4 sm:grid-cols-3">
              {featuredFacilities.map((facility) => (
                <FacilityCard key={facility.id} facility={facility} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <SectionHeader title="Community Notices" viewAllHref="/member/notices" />
          <div className="space-y-3">
            {topNotices.map((notice) => (
              <NoticeItem key={notice.id} notice={notice} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
