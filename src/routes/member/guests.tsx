import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from '#/lib/toast'
import { PageHeader } from '#/components/stayflow/page-header'
import { ApiError } from '#/lib/api/client'
import {
  cancelGuest,
  getMyGuests,
  registerGuest,
  updateGuestDetails,
} from '#/lib/api/guest'
import type { GuestView } from '#/lib/api/guest'
import { useMyProfile } from '#/lib/store/member-profile'
import { nextDays, toDateKey } from '#/lib/booking-slots'
import { byHistorySort, isPastDate } from '#/lib/history'
import type { HistorySort } from '#/lib/history'
import { GuestRegisterForm } from '#/components/stayflow/guests/guest-register-form'
import { GuestList } from '#/components/stayflow/guests/guest-list'
import { GuestDetailDialog } from '#/components/stayflow/guests/guest-detail-dialog'

export const Route = createFileRoute('/member/guests')({
  head: () => ({ meta: [{ title: 'Guests — StayFlow Member' }] }),
  component: GuestsPage,
})

const errText = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Something went wrong. Try again.'

function GuestsPage() {
  const {
    profile,
    status: profileStatus,
    reload: reloadProfile,
  } = useMyProfile()
  const days = React.useMemo(() => nextDays(14), [])

  const [guests, setGuests] = React.useState<GuestView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [name, setName] = React.useState('')
  const [purpose, setPurpose] = React.useState('')
  const [vehiclePlate, setVehiclePlate] = React.useState('')
  const [arrivalDate, setArrivalDate] = React.useState(days[0])
  const [arrivalTime, setArrivalTime] = React.useState('2:00 PM')
  const [newGuest, setNewGuest] = React.useState<GuestView | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [canceling, setCanceling] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [savingEdit, setSavingEdit] = React.useState(false)
  // Mirror each boolean but checked/updated synchronously — two clicks before React
  // re-renders (and disables the button) would both read the same stale false state
  // and both fire; a ref is always current.
  const submittingRef = React.useRef(false)
  const cancelingRef = React.useRef(false)
  const savingEditRef = React.useRef(false)
  const [editPurpose, setEditPurpose] = React.useState('')
  const [editPlate, setEditPlate] = React.useState('')
  const [editDate, setEditDate] = React.useState(days[0])
  const [editTime, setEditTime] = React.useState('')
  const [historySort, setHistorySort] = React.useState<HistorySort>('newest')
  const [showHistory, setShowHistory] = React.useState(false)

  const load = React.useCallback((residentId: string) => {
    let active = true
    setStatus('loading')
    getMyGuests(residentId)
      .then((data) => {
        if (!active) return
        setGuests(data)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    if (profile) return load(profile.id)
    // Profile fetch itself failed — without this the page sits on the loading
    // skeleton forever since load() never fires and never flips local status.
    if (profileStatus === 'error') setStatus('error')
  }, [profile, profileStatus, load])

  // Upcoming = still-expected visits whose arrival date hasn't passed; everything
  // else (checked-out, or any past date) drops into a collapsible history.
  const upcomingGuests = [...guests]
    .filter((g) => g.status !== 'checked-out' && !isPastDate(g.arrivalDate))
    .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate))
  const pastGuests = [...guests]
    .filter((g) => g.status === 'checked-out' || isPastDate(g.arrivalDate))
    .sort((a, b) => byHistorySort(historySort)(a.arrivalDate, b.arrivalDate))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !profile || submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      // Full ISO — the API's date column rejects a bare "YYYY-MM-DD".
      const arrivalDateIso = new Date(toDateKey(arrivalDate)).toISOString()
      const guest = await registerGuest({
        name: name.trim(),
        purpose: purpose.trim() || 'Personal visit',
        vehiclePlate: vehiclePlate.trim() || undefined,
        arrivalDate: arrivalDateIso,
        arrivalTime,
      })
      setGuests((prev) => [guest, ...prev])
      setNewGuest(guest)
      setName('')
      setPurpose('')
      setVehiclePlate('')
      toast.success('Guest registered', {
        description: `${guest.name} · Pass ${guest.passNumber}`,
      })
    } catch (err) {
      toast.error(errText(err))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!newGuest || cancelingRef.current) return
    cancelingRef.current = true
    setCanceling(true)
    try {
      await cancelGuest(newGuest.id)
      setGuests((prev) => prev.filter((g) => g.id !== newGuest.id))
      toast.success('Guest registration cancelled')
      setNewGuest(null)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      cancelingRef.current = false
      setCanceling(false)
    }
  }

  function closeDialog() {
    setNewGuest(null)
    setEditing(false)
  }

  function startEdit() {
    if (!newGuest) return
    setEditPurpose(newGuest.purpose)
    setEditPlate(newGuest.vehiclePlate ?? '')
    setEditDate(
      days.find((d) => toDateKey(d) === newGuest.arrivalDate.slice(0, 10)) ??
        days[0],
    )
    setEditTime(newGuest.arrivalTime)
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!newGuest || savingEditRef.current) return
    savingEditRef.current = true
    setSavingEdit(true)
    try {
      const updated = await updateGuestDetails(newGuest.id, {
        purpose: editPurpose.trim() || 'Personal visit',
        vehiclePlate: editPlate.trim() || undefined,
        arrivalDate: new Date(toDateKey(editDate)).toISOString(),
        arrivalTime: editTime,
      })
      setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
      setNewGuest(updated)
      setEditing(false)
      toast.success('Guest details updated')
    } catch (err) {
      toast.error(errText(err))
    } finally {
      savingEditRef.current = false
      setSavingEdit(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Access"
        title="Guests"
        description="Register a guest and generate their entry pass."
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <GuestRegisterForm
          days={days}
          name={name}
          purpose={purpose}
          vehiclePlate={vehiclePlate}
          arrivalDate={arrivalDate}
          arrivalTime={arrivalTime}
          submitting={submitting}
          disabled={!profile}
          onNameChange={setName}
          onPurposeChange={setPurpose}
          onVehiclePlateChange={setVehiclePlate}
          onArrivalDateChange={setArrivalDate}
          onArrivalTimeChange={setArrivalTime}
          onSubmit={handleSubmit}
        />

        <GuestList
          status={status}
          guests={guests}
          upcomingGuests={upcomingGuests}
          pastGuests={pastGuests}
          showHistory={showHistory}
          historySort={historySort}
          onRetry={() => (profile ? load(profile.id) : reloadProfile())}
          onSelect={(guest) => {
            setNewGuest(guest)
            setEditing(false)
          }}
          onToggleHistory={() => setShowHistory((v) => !v)}
          onHistorySortChange={setHistorySort}
        />
      </div>

      <GuestDetailDialog
        guest={newGuest}
        editing={editing}
        days={days}
        editPurpose={editPurpose}
        editPlate={editPlate}
        editDate={editDate}
        editTime={editTime}
        savingEdit={savingEdit}
        canceling={canceling}
        onClose={closeDialog}
        onStartEdit={startEdit}
        onCancelEdit={() => setEditing(false)}
        onEditPurposeChange={setEditPurpose}
        onEditPlateChange={setEditPlate}
        onEditDateChange={setEditDate}
        onEditTimeChange={setEditTime}
        onSaveEdit={handleSaveEdit}
        onCancelGuest={handleCancel}
      />
    </div>
  )
}
