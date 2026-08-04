import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { Button } from '#/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { ResidentsTab } from '#/components/stayflow/users/residents-tab'
import { StaffTab } from '#/components/stayflow/users/staff-tab'
import { ResidentFormSheet } from '#/components/stayflow/users/resident-form-sheet'
import { StaffFormSheet } from '#/components/stayflow/users/staff-form-sheet'
import { UserActionDialogs } from '#/components/stayflow/users/user-action-dialogs'
import {
  newResidentDraft,
  newStaffDraft,
} from '#/components/stayflow/users/types'
import type {
  ResidentDraft,
  StaffDraft,
} from '#/components/stayflow/users/types'
import { ApiError } from '#/lib/api/client'
import { useAuthStore } from '#/lib/store/auth-store'
import {
  createResident,
  createResidentLogin,
  deleteResident,
  getAllResidents,
  updateResident,
} from '#/lib/api/resident'
import type { ResidentProfile } from '#/lib/api/resident'
import {
  createStaffMember,
  getAllStaff,
  removeStaffMember,
  updateStaffMember,
} from '#/lib/api/staff'
import type { StaffMemberView } from '#/lib/api/staff'

export const Route = createFileRoute('/management/users')({
  head: () => ({ meta: [{ title: 'Users — StayFlow Management' }] }),
  component: UsersPage,
})

const errText = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Something went wrong. Try again.'

function UsersPage() {
  const isManagement = useAuthStore((s) => s.user?.role === 'MANAGEMENT')
  const [residents, setResidents] = React.useState<ResidentProfile[]>([])
  const [staff, setStaff] = React.useState<StaffMemberView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [tab, setTab] = React.useState<'members' | 'staff'>('members')
  const [editingResident, setEditingResident] =
    React.useState<ResidentDraft | null>(null)
  const [editingStaff, setEditingStaff] = React.useState<StaffDraft | null>(
    null,
  )
  const [createLoginToo, setCreateLoginToo] = React.useState(true)
  const [deleteTarget, setDeleteTarget] = React.useState<{
    kind: 'resident' | 'staff'
    id: string
    name: string
  } | null>(null)
  const [confirmLoginTarget, setConfirmLoginTarget] = React.useState<{
    id: string
    name: string
  } | null>(null)
  const [revealedLogin, setRevealedLogin] = React.useState<{
    name: string
    email: string
    tempPassword: string
  } | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [creatingLogin, setCreatingLogin] = React.useState(false)
  // Mirror each boolean but checked/updated synchronously — two clicks before React
  // re-renders (and disables the button) would both read the same stale state and
  // both fire; a ref is always current. saveResident/saveStaff share one ref since
  // only one of their two dialogs can be open at a time, same as the state they mirror.
  const savingRef = React.useRef(false)
  const deletingRef = React.useRef(false)
  const creatingLoginRef = React.useRef(false)

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    Promise.all([getAllResidents(), getAllStaff()])
      .then(([r, s]) => {
        if (!active) return
        setResidents(r)
        setStaff(s)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => load(), [load])

  async function saveResident() {
    if (!editingResident || savingRef.current) return
    if (
      !editingResident.name.trim() ||
      !editingResident.email.trim() ||
      !editingResident.unit.trim()
    ) {
      toast.error('Name, email, and unit are required.')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const payload = {
        name: editingResident.name.trim(),
        email: editingResident.email.trim(),
        unit: editingResident.unit.trim(),
        tier: editingResident.tier,
      }
      const isNew = !editingResident.id
      const saved = editingResident.id
        ? await updateResident(editingResident.id, payload)
        : await createResident(payload)
      setResidents((prev) => {
        const exists = prev.some((r) => r.id === saved.id)
        return exists
          ? prev.map((r) => (r.id === saved.id ? saved : r))
          : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(editingResident.id ? 'Member updated' : 'Member added')
      setEditingResident(null)

      // Login creation is a separate call from profile creation — a failure here must
      // never undo or obscure the "Member added" success above.
      if (isNew && isManagement && createLoginToo) {
        try {
          const { resident, tempPassword } = await createResidentLogin(saved.id)
          setResidents((prev) =>
            prev.map((r) => (r.id === resident.id ? resident : r)),
          )
          setRevealedLogin({
            name: resident.name,
            email: resident.email,
            tempPassword,
          })
        } catch {
          toast.error(
            'Member added, but the login could not be created automatically. Use Create Login from the table to try again.',
          )
        }
      }
    } catch (err) {
      toast.error(errText(err))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function confirmCreateLogin() {
    if (!confirmLoginTarget || creatingLoginRef.current) return
    creatingLoginRef.current = true
    setCreatingLogin(true)
    try {
      const { resident, tempPassword } = await createResidentLogin(
        confirmLoginTarget.id,
      )
      setResidents((prev) =>
        prev.map((r) => (r.id === resident.id ? resident : r)),
      )
      setConfirmLoginTarget(null)
      setRevealedLogin({
        name: resident.name,
        email: resident.email,
        tempPassword,
      })
    } catch (err) {
      toast.error(errText(err))
    } finally {
      creatingLoginRef.current = false
      setCreatingLogin(false)
    }
  }

  async function saveStaff() {
    if (!editingStaff || savingRef.current) return
    if (!editingStaff.name.trim() || !editingStaff.email.trim()) {
      toast.error('Name and email are required.')
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const payload = {
        name: editingStaff.name.trim(),
        role: editingStaff.role,
        email: editingStaff.email.trim(),
        shift: editingStaff.shift,
      }
      const saved = editingStaff.id
        ? await updateStaffMember(editingStaff.id, payload)
        : await createStaffMember(payload)
      setStaff((prev) => {
        const exists = prev.some((s) => s.id === saved.id)
        return exists
          ? prev.map((s) => (s.id === saved.id ? saved : s))
          : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(editingStaff.id ? 'Staff updated' : 'Staff added')
      setEditingStaff(null)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    try {
      if (deleteTarget.kind === 'resident') {
        await deleteResident(deleteTarget.id)
        setResidents((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      } else {
        await removeStaffMember(deleteTarget.id)
        setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      }
      toast.success(`${deleteTarget.name} removed`)
      setDeleteTarget(null)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Directory"
        title="Users"
        description="Manage member and staff accounts."
        actions={
          <Button
            className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
            onClick={() => {
              if (tab === 'members') {
                setEditingResident(newResidentDraft())
                setCreateLoginToo(true)
              } else {
                setEditingStaff(newStaffDraft())
              }
            }}
          >
            <Plus className="size-4" />
            Add {tab === 'members' ? 'Member' : 'Staff'}
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="mb-6"
      >
        <TabsList className="bg-surface">
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold"
          >
            Members ({residents.length})
          </TabsTrigger>
          <TabsTrigger
            value="staff"
            className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold"
          >
            Staff ({staff.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">
            We couldn't load users right now.
          </p>
          <Button
            onClick={load}
            className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            Retry
          </Button>
        </div>
      ) : tab === 'members' && residents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-text">
          No members yet. Add your first resident.
        </div>
      ) : tab === 'staff' && staff.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted-text">
          No staff yet. Add your first team member.
        </div>
      ) : tab === 'members' ? (
        <ResidentsTab
          residents={residents}
          isManagement={isManagement}
          onCreateLogin={(id, name) => setConfirmLoginTarget({ id, name })}
          onEdit={(r) =>
            setEditingResident({
              id: r.id,
              name: r.name,
              email: r.email,
              unit: r.unit,
              tier: r.tier,
            })
          }
          onDelete={(id, name) =>
            setDeleteTarget({ kind: 'resident', id, name })
          }
        />
      ) : (
        <StaffTab
          staff={staff}
          onEdit={(s) =>
            setEditingStaff({
              id: s.id,
              name: s.name,
              role: s.role,
              email: s.email,
              shift: s.shift,
            })
          }
          onDelete={(id, name) => setDeleteTarget({ kind: 'staff', id, name })}
        />
      )}

      <ResidentFormSheet
        draft={editingResident}
        onOpenChange={() => setEditingResident(null)}
        onChange={setEditingResident}
        isManagement={isManagement}
        createLoginToo={createLoginToo}
        onCreateLoginTooChange={setCreateLoginToo}
        saving={saving}
        onSave={saveResident}
      />

      <StaffFormSheet
        draft={editingStaff}
        onOpenChange={() => setEditingStaff(null)}
        onChange={setEditingStaff}
        saving={saving}
        onSave={saveStaff}
      />

      <UserActionDialogs
        deleteTarget={deleteTarget}
        onDeleteOpenChange={() => setDeleteTarget(null)}
        deleting={deleting}
        onConfirmDelete={confirmDelete}
        confirmLoginTarget={confirmLoginTarget}
        onLoginOpenChange={() => setConfirmLoginTarget(null)}
        creatingLogin={creatingLogin}
        onConfirmCreateLogin={confirmCreateLogin}
        revealedLogin={revealedLogin}
        onRevealedOpenChange={() => setRevealedLogin(null)}
      />
    </div>
  )
}
