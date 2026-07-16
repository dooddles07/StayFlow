import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { CalendarPlus, CloudSun, Sunset, UserPlus, UtensilsCrossed, Waves } from 'lucide-react'
import { SectionHeader } from '#/components/stayflow/section-header'
import { ReservationRow } from '#/components/stayflow/reservation-row'
import { FacilityCard } from '#/components/stayflow/facility-card'
import { NoticeCard } from '#/components/stayflow/notice-card'
import { QuickActionCard } from '#/components/stayflow/quick-action-card'
import { EmptyState } from '#/components/stayflow/empty-state'
import { Button } from '#/components/ui/button'
import { getNotices } from '#/lib/api/notice'
import { getFacilities } from '#/lib/api/facility'
import { getMyBookings, type BookingView } from '#/lib/api/booking'
import { getMyReservations, type ReservationView } from '#/lib/api/diningReservation'
import { getRestaurants } from '#/lib/api/restaurant'
import { tierLabel } from '#/lib/api/resident'
import { useMyProfile } from '#/lib/store/member-profile'
import { getWeather, type WeatherSnapshot } from '#/lib/weather'
import type { Facility, Notice } from '#/lib/mock/types'

export const Route = createFileRoute('/member/')({
  head: () => ({ meta: [{ title: 'Dashboard — StayFlow Member' }] }),
  component: MemberDashboard,
})

type LoadStatus = 'loading' | 'ready' | 'error'

function MemberDashboard() {
  const { profile } = useMyProfile()
  const firstName = profile?.name.split(' ')[0] ?? 'Resident'

  const [facilities, setFacilities] = React.useState<Facility[]>([])
  const [facilitiesStatus, setFacilitiesStatus] = React.useState<LoadStatus>('loading')
  const loadFacilities = React.useCallback(() => {
    let active = true
    setFacilitiesStatus('loading')
    getFacilities()
      .then((data) => {
        if (!active) return
        setFacilities(data)
        setFacilitiesStatus('ready')
      })
      .catch(() => {
        if (active) setFacilitiesStatus('error')
      })
    return () => {
      active = false
    }
  }, [])
  React.useEffect(() => loadFacilities(), [loadFacilities])

  const [restaurantCount, setRestaurantCount] = React.useState<number | null>(null)
  React.useEffect(() => {
    let active = true
    getRestaurants()
      .then((data) => active && setRestaurantCount(data.length))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const [weather, setWeather] = React.useState<WeatherSnapshot | null>(null)
  const [weatherStatus, setWeatherStatus] = React.useState<LoadStatus>('loading')
  React.useEffect(() => {
    let active = true
    getWeather()
      .then((data) => {
        if (!active) return
        setWeather(data)
        setWeatherStatus('ready')
      })
      .catch(() => {
        if (active) setWeatherStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  const [bookings, setBookings] = React.useState<BookingView[]>([])
  const [reservations, setReservations] = React.useState<ReservationView[]>([])
  const [upcomingStatus, setUpcomingStatus] = React.useState<LoadStatus>('loading')
  const loadUpcoming = React.useCallback((residentId?: string) => {
    if (!residentId) return
    let active = true
    setUpcomingStatus('loading')
    Promise.all([getMyBookings(residentId), getMyReservations(residentId)])
      .then(([b, r]) => {
        if (!active) return
        setBookings(b)
        setReservations(r)
        setUpcomingStatus('ready')
      })
      .catch(() => {
        if (active) setUpcomingStatus('error')
      })
    return () => {
      active = false
    }
  }, [])
  React.useEffect(() => loadUpcoming(profile?.id), [profile, loadUpcoming])

  const upcoming = [
    ...bookings
      .filter((b) => b.status !== 'cancelled')
      .map((b) => ({
        id: b.id,
        date: b.date,
        title: b.facilityName ?? 'Facility',
        subtitle: b.timeSlot,
        status: b.status,
        meta: `Party of ${b.partySize}`,
      })),
    ...reservations
      .filter((r) => r.status !== 'cancelled')
      .map((r) => ({
        id: r.id,
        date: r.date,
        title: r.restaurantName ?? 'Restaurant',
        subtitle: r.time,
        status: r.status,
        meta: `Party of ${r.partySize}`,
      })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  const featuredFacilities = facilities.filter((f) => f.status === 'open').slice(0, 3)

  const [notices, setNotices] = React.useState<Notice[]>([])
  const [noticesStatus, setNoticesStatus] = React.useState<LoadStatus>('loading')
  const loadNotices = React.useCallback(() => {
    let active = true
    setNoticesStatus('loading')
    getNotices()
      .then((data) => {
        if (!active) return
        setNotices(data)
        setNoticesStatus('ready')
      })
      .catch(() => {
        if (active) setNoticesStatus('error')
      })
    return () => {
      active = false
    }
  }, [])
  React.useEffect(() => loadNotices(), [loadNotices])
  const topNotices = [...notices]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.postedAt.localeCompare(a.postedAt))
    .slice(0, 3)

  return (
    <div className="mx-auto max-w-7xl">
      <div className="animate-fade-in mb-6 flex flex-col justify-between gap-6 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-hover p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-gold">Welcome back</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Good evening, {firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-text">{profile?.unit} · {profile ? tierLabel(profile.tier) : ''} Member</p>
        </div>
        {weatherStatus === 'loading' ? (
          <div className="flex gap-3">
            <div className="h-[52px] w-40 animate-pulse rounded-xl border border-border bg-canvas/40" />
            <div className="h-[52px] w-32 animate-pulse rounded-xl border border-border bg-canvas/40" />
          </div>
        ) : weatherStatus === 'ready' && weather ? (
          <div className="flex gap-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-canvas/40 px-4 py-3">
              <CloudSun className="size-5 text-accent-gold" />
              <div>
                <p className="text-sm font-medium text-foreground">{weather.tempF}°F · {weather.condition}</p>
                <p className="text-[11px] text-muted-text">San Francisco</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-canvas/40 px-4 py-3">
              <Sunset className="size-5 text-accent-gold" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {weather.sunset.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </p>
                <p className="text-[11px] text-muted-text">Sunset tonight</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickActionCard icon={Waves} label="Book a Facility" description="Pool, gym & more" to="/member/facilities" />
        <QuickActionCard
          icon={UtensilsCrossed}
          label="Reserve Dining"
          description={restaurantCount === null ? 'Book a table' : `${restaurantCount} restaurant${restaurantCount === 1 ? '' : 's'}`}
          to="/member/dining"
        />
        <QuickActionCard icon={UserPlus} label="Register Guest" description="Get a pass" to="/member/guests" />
        <QuickActionCard icon={CalendarPlus} label="Browse Events" description="This week" to="/member/events" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader title="Upcoming Reservations" />
          {upcomingStatus === 'loading' ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-surface" />
              ))}
            </div>
          ) : upcomingStatus === 'error' ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-text">We couldn't load your reservations right now.</p>
              <Button onClick={() => loadUpcoming(profile?.id)} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
                Retry
              </Button>
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={Waves} title="No upcoming reservations" description="Book a facility or reserve dining to see it here." />
          ) : (
            <div className="space-y-3">
              {upcoming.map((item) => (
                <ReservationRow
                  key={item.id}
                  date={item.date}
                  title={item.title}
                  subtitle={item.subtitle}
                  status={item.status}
                  meta={item.meta}
                />
              ))}
            </div>
          )}

          <div className="mt-8">
            <SectionHeader title="Featured Facilities" viewAllHref="/member/facilities" />
            {facilitiesStatus === 'loading' ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
                ))}
              </div>
            ) : facilitiesStatus === 'error' ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                <p className="text-sm text-muted-text">We couldn't load facilities right now.</p>
                <Button onClick={loadFacilities} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {featuredFacilities.map((facility) => (
                  <FacilityCard key={facility.id} facility={facility} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="Community Notices" viewAllHref="/member/notices" />
          {noticesStatus === 'loading' ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
              ))}
            </div>
          ) : noticesStatus === 'error' ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center">
              <p className="text-sm text-muted-text">We couldn't load notices right now.</p>
              <Button onClick={loadNotices} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {topNotices.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
