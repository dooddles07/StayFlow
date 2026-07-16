import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft, MapPin, Star } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { ApiError } from '#/lib/api/client'
import { getRestaurant } from '#/lib/api/restaurant'
import { requestReservation } from '#/lib/api/diningReservation'
import { useMyProfile } from '#/lib/store/member-profile'
import { nextDays, toDateKey } from '#/lib/booking-slots'
import type { DiningReservation } from '#/lib/mock/types'

export const Route = createFileRoute('/member/dining/$id')({
  loader: async ({ params }) => {
    try {
      const restaurant = await getRestaurant(params.id)
      return { restaurant }
    } catch {
      throw notFound()
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.restaurant.name ?? 'Restaurant'} — StayFlow` }] }),
  component: RestaurantDetail,
})

const TIME_OPTIONS = ['11:30 AM', '12:30 PM', '1:30 PM', '5:30 PM', '6:30 PM', '7:30 PM', '8:30 PM', '9:30 PM']
const SEATING_OPTIONS: DiningReservation['seating'][] = ['Indoor', 'Outdoor', 'Private Room', 'Bar']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

function RestaurantDetail() {
  const { restaurant } = Route.useLoaderData()
  const { profile } = useMyProfile()
  const days = React.useMemo(() => nextDays(14), [])

  const [date, setDate] = React.useState(days[0]!)
  const [time, setTime] = React.useState(TIME_OPTIONS[3]!)
  const [partySize, setPartySize] = React.useState(2)
  const [occasion, setOccasion] = React.useState('')
  const [dietary, setDietary] = React.useState('')
  const [seating, setSeating] = React.useState<DiningReservation['seating']>('Indoor')
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || submitting) return
    setSubmitting(true)
    try {
      // Full ISO — the API's date column rejects a bare "YYYY-MM-DD".
      const dateIso = new Date(toDateKey(date)).toISOString()
      await requestReservation({
        restaurantId: restaurant.id,
        date: dateIso,
        time,
        partySize,
        occasion: occasion.trim() || undefined,
        dietary: dietary.trim() || undefined,
        seating,
      })
      toast.success('Reservation requested', {
        description: `${restaurant.name} · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`,
      })
      setOccasion('')
      setDietary('')
    } catch (err) {
      toast.error(errText(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/member/dining" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to Dining
      </Link>

      <div className="animate-fade-in relative mb-6 h-56 w-full overflow-hidden rounded-2xl bg-surface-hover sm:h-72">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-canvas via-canvas/20 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-accent-gold">{restaurant.cuisine}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{restaurant.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
              <MapPin className="size-3.5" />
              {restaurant.location}
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-canvas/60 px-2.5 py-1 text-sm text-accent-gold backdrop-blur">
            <Star className="size-3.5 fill-current" />
            {restaurant.rating}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">About</h2>
          <p className="text-sm leading-relaxed text-muted-text">{restaurant.description}</p>
          <p className="text-xs text-muted-text">Open {restaurant.openHours} · {restaurant.priceRange}</p>
        </div>

        <form onSubmit={handleSubmit} className="animate-fade-in space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-foreground">Reserve a Table</h2>

          <div>
            <Label className="mb-1.5 text-xs text-muted-text">Date</Label>
            <Select value={toDateKey(date)} onValueChange={(v) => setDate(days.find((d) => toDateKey(d) === v) ?? days[0]!)}>
              <SelectTrigger className="border-border bg-canvas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface text-foreground">
                {days.map((d) => (
                  <SelectItem key={toDateKey(d)} value={toDateKey(d)}>
                    {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 text-xs text-muted-text">Time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="border-border bg-canvas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface text-foreground">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="party-size" className="mb-1.5 text-xs text-muted-text">
              Party size
            </Label>
            <Input
              id="party-size"
              type="number"
              min={1}
              max={12}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value) || 1)}
              className="border-border bg-canvas"
            />
          </div>

          <div>
            <Label className="mb-1.5 text-xs text-muted-text">Seating</Label>
            <Select value={seating} onValueChange={(v) => setSeating(v as DiningReservation['seating'])}>
              <SelectTrigger className="border-border bg-canvas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface text-foreground">
                {SEATING_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="occasion" className="mb-1.5 text-xs text-muted-text">
              Occasion (optional)
            </Label>
            <Input
              id="occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Birthday, anniversary…"
              className="border-border bg-canvas"
            />
          </div>

          <div>
            <Label htmlFor="dietary" className="mb-1.5 text-xs text-muted-text">
              Dietary notes (optional)
            </Label>
            <Input
              id="dietary"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Allergies, preferences…"
              className="border-border bg-canvas"
            />
          </div>

          <Button type="submit" disabled={submitting || !profile} className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            {submitting ? 'Requesting…' : 'Request Reservation'}
          </Button>
        </form>
      </div>
    </div>
  )
}
