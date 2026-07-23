import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Copy, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { AvatarInitials } from '#/components/stayflow/avatar-initials'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Checkbox } from '#/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { ApiError } from '#/lib/api/client'
import { useAuthStore } from '#/lib/store/auth-store'
import {
  createResident,
  createResidentLogin,
  deleteResident,
  getAllResidents,
  tierLabel,
  updateResident,
  type ResidentProfile,
  type ResidentTier,
} from '#/lib/api/resident'
import {
  createStaffMember,
  getAllStaff,
  removeStaffMember,
  updateStaffMember,
  type StaffMemberView,
  type StaffShift,
} from '#/lib/api/staff'

export const Route = createFileRoute('/management/users')({
  head: () => ({ meta: [{ title: 'Users — StayFlow Management' }] }),
  component: UsersPage,
})

const tiers: ResidentTier[] = ['SIGNATURE', 'PRESTIGE', 'ELITE']
const roles = ['Concierge', 'Facilities Manager', 'Guest Relations', 'Dining Manager', 'Security', 'Operations']
const shifts: StaffShift[] = ['Morning', 'Afternoon', 'Night']
const errText = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

interface ResidentDraft {
  id?: string
  name: string
  email: string
  unit: string
  tier: ResidentTier
}

interface StaffDraft {
  id?: string
  name: string
  role: string
  email: string
  shift: StaffShift
}

function newResidentDraft(): ResidentDraft {
  return { name: '', email: '', unit: '', tier: 'SIGNATURE' }
}

function newStaffDraft(): StaffDraft {
  return { name: '', role: 'Concierge', email: '', shift: 'Morning' }
}

// 'active' gets no badge at all — keeping visual noise low on the common case once
// most residents have logins.
function LoginStatusBadge({ status }: { status: ResidentProfile['loginStatus'] }) {
  if (status === 'none') return <span className="text-xs text-muted-text">No login</span>
  if (status === 'pending') {
    return <span className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-[11px] font-medium text-accent-gold">Pending</span>
  }
  return null
}

function UsersPage() {
  const isManagement = useAuthStore((s) => s.user?.role === 'MANAGEMENT')
  const [residents, setResidents] = React.useState<ResidentProfile[]>([])
  const [staff, setStaff] = React.useState<StaffMemberView[]>([])
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading')
  const [tab, setTab] = React.useState<'members' | 'staff'>('members')
  const [editingResident, setEditingResident] = React.useState<ResidentDraft | null>(null)
  const [editingStaff, setEditingStaff] = React.useState<StaffDraft | null>(null)
  const [createLoginToo, setCreateLoginToo] = React.useState(true)
  const [deleteTarget, setDeleteTarget] = React.useState<{ kind: 'resident' | 'staff'; id: string; name: string } | null>(null)
  const [confirmLoginTarget, setConfirmLoginTarget] = React.useState<{ id: string; name: string } | null>(null)
  const [revealedLogin, setRevealedLogin] = React.useState<{ name: string; email: string; tempPassword: string } | null>(null)
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
    if (!editingResident.name.trim() || !editingResident.email.trim() || !editingResident.unit.trim()) {
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
      const saved = editingResident.id ? await updateResident(editingResident.id, payload) : await createResident(payload)
      setResidents((prev) => {
        const exists = prev.some((r) => r.id === saved.id)
        return exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(editingResident.id ? 'Member updated' : 'Member added')
      setEditingResident(null)

      // Login creation is a separate call from profile creation — a failure here must
      // never undo or obscure the "Member added" success above.
      if (isNew && isManagement && createLoginToo) {
        try {
          const { resident, tempPassword } = await createResidentLogin(saved.id)
          setResidents((prev) => prev.map((r) => (r.id === resident.id ? resident : r)))
          setRevealedLogin({ name: resident.name, email: resident.email, tempPassword })
        } catch {
          toast.error('Member added, but the login could not be created automatically. Use Create Login from the table to try again.')
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
      const { resident, tempPassword } = await createResidentLogin(confirmLoginTarget.id)
      setResidents((prev) => prev.map((r) => (r.id === resident.id ? resident : r)))
      setConfirmLoginTarget(null)
      setRevealedLogin({ name: resident.name, email: resident.email, tempPassword })
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
      const saved = editingStaff.id ? await updateStaffMember(editingStaff.id, payload) : await createStaffMember(payload)
      setStaff((prev) => {
        const exists = prev.some((s) => s.id === saved.id)
        return exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
        <TabsList className="bg-surface">
          <TabsTrigger value="members" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Members ({residents.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Staff ({staff.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {status === 'loading' ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : status === 'error' ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">We couldn't load users right now.</p>
          <Button onClick={load} className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft">
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
        <>
          <div className="space-y-3 sm:hidden">
            {residents.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AvatarInitials seed={r.name} className="size-8 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.name}</p>
                    <p className="truncate text-xs text-muted-text">{r.unit} · {tierLabel(r.tier)}</p>
                    <LoginStatusBadge status={r.loginStatus} />
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {isManagement && r.loginStatus === 'none' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-accent-gold hover:bg-accent-gold/10"
                      aria-label={`Create login for ${r.name}`}
                      onClick={() => setConfirmLoginTarget({ id: r.id, name: r.name })}
                    >
                      <KeyRound className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-text hover:text-foreground"
                    onClick={() => setEditingResident({ id: r.id, name: r.name, email: r.email, unit: r.unit, tier: r.tier })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => setDeleteTarget({ kind: 'resident', id: r.id, name: r.name })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Login</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {residents.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AvatarInitials seed={r.name} className="size-8" />
                        <span className="font-medium text-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-text">{r.unit}</td>
                    <td className="px-4 py-3 text-muted-text">{tierLabel(r.tier)}</td>
                    <td className="px-4 py-3 text-muted-text">{r.email}</td>
                    <td className="px-4 py-3">
                      <LoginStatusBadge status={r.loginStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {isManagement && r.loginStatus === 'none' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-accent-gold hover:bg-accent-gold/10"
                            aria-label={`Create login for ${r.name}`}
                            onClick={() => setConfirmLoginTarget({ id: r.id, name: r.name })}
                          >
                            <KeyRound className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-text hover:text-foreground"
                          onClick={() => setEditingResident({ id: r.id, name: r.name, email: r.email, unit: r.unit, tier: r.tier })}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-rose-400 hover:bg-rose-500/10"
                          onClick={() => setDeleteTarget({ kind: 'resident', id: r.id, name: r.name })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <AvatarInitials seed={s.name} className="size-8 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-muted-text">{s.role} · {s.shift}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-text hover:text-foreground"
                    onClick={() => setEditingStaff({ id: s.id, name: s.name, role: s.role, email: s.email, shift: s.shift })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-rose-400 hover:bg-rose-500/10"
                    onClick={() => setDeleteTarget({ kind: 'staff', id: s.id, name: s.name })}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
                <tr>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Shift</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AvatarInitials seed={s.name} className="size-8" />
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-text">{s.role}</td>
                    <td className="px-4 py-3 text-muted-text">{s.shift}</td>
                    <td className="px-4 py-3 text-muted-text">{s.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-text hover:text-foreground"
                          onClick={() => setEditingStaff({ id: s.id, name: s.name, role: s.role, email: s.email, shift: s.shift })}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-rose-400 hover:bg-rose-500/10"
                          onClick={() => setDeleteTarget({ kind: 'staff', id: s.id, name: s.name })}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Sheet open={!!editingResident} onOpenChange={(open) => !open && setEditingResident(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{editingResident?.id ? 'Edit Member' : 'Add Member'}</SheetTitle>
          </SheetHeader>
          {editingResident && (
            <div className="space-y-4 px-4 pb-6">
              <div>
                <Label htmlFor="resident-name" className="mb-1.5 text-xs text-muted-text">Name</Label>
                <Input id="resident-name" value={editingResident.name} onChange={(e) => setEditingResident({ ...editingResident, name: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label htmlFor="resident-email" className="mb-1.5 text-xs text-muted-text">Email</Label>
                <Input id="resident-email" value={editingResident.email} onChange={(e) => setEditingResident({ ...editingResident, email: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label htmlFor="resident-unit" className="mb-1.5 text-xs text-muted-text">Unit</Label>
                <Input id="resident-unit" value={editingResident.unit} onChange={(e) => setEditingResident({ ...editingResident, unit: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label htmlFor="resident-tier" className="mb-1.5 text-xs text-muted-text">Tier</Label>
                <Select value={editingResident.tier} onValueChange={(v) => setEditingResident({ ...editingResident, tier: v as ResidentTier })}>
                  <SelectTrigger id="resident-tier" className="border-border bg-canvas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {tiers.map((t) => (
                      <SelectItem key={t} value={t}>
                        {tierLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editingResident.id && isManagement && (
                <label className="flex items-start gap-2.5 rounded-xl border border-border bg-canvas p-3">
                  <Checkbox checked={createLoginToo} onCheckedChange={(v) => setCreateLoginToo(!!v)} className="mt-0.5" />
                  <span className="text-xs text-muted-text">
                    <span className="block font-medium text-foreground">Also create a login now</span>
                    Generates a temporary password to relay to the resident in person. You can do this later from the table instead.
                  </span>
                </label>
              )}
              {!editingResident.id && (
                <p className="text-[11px] text-muted-text">
                  This reserves the unit. Phone and emergency contact are filled in by the resident once they have a login.
                </p>
              )}
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" disabled={saving} onClick={saveResident}>
                {saving ? 'Saving…' : 'Save Member'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{editingStaff?.id ? 'Edit Staff' : 'Add Staff'}</SheetTitle>
          </SheetHeader>
          {editingStaff && (
            <div className="space-y-4 px-4 pb-6">
              <div>
                <Label htmlFor="staff-name" className="mb-1.5 text-xs text-muted-text">Name</Label>
                <Input id="staff-name" value={editingStaff.name} onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label htmlFor="staff-email" className="mb-1.5 text-xs text-muted-text">Email</Label>
                <Input id="staff-email" value={editingStaff.email} onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label htmlFor="staff-role" className="mb-1.5 text-xs text-muted-text">Role</Label>
                <Select value={editingStaff.role} onValueChange={(v) => setEditingStaff({ ...editingStaff, role: v })}>
                  <SelectTrigger id="staff-role" className="border-border bg-canvas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="staff-shift" className="mb-1.5 text-xs text-muted-text">Shift</Label>
                <Select value={editingStaff.shift} onValueChange={(v) => setEditingStaff({ ...editingStaff, shift: v as StaffShift })}>
                  <SelectTrigger id="staff-shift" className="border-border bg-canvas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {shifts.map((sh) => (
                      <SelectItem key={sh} value={sh}>
                        {sh}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" disabled={saving} onClick={saveStaff}>
                {saving ? 'Saving…' : 'Save Staff'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} className="bg-rose-500 text-white hover:bg-rose-600" onClick={confirmDelete}>
              {deleting ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmLoginTarget} onOpenChange={(open) => !open && setConfirmLoginTarget(null)}>
        <AlertDialogContent className="border-border bg-surface text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Create a login for {confirmLoginTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This generates a one-time temporary password. You'll need to relay it to them in person — it won't be shown again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-foreground hover:bg-surface-hover">Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={creatingLogin} className="bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={confirmCreateLogin}>
              {creatingLogin ? 'Creating…' : 'Create Login'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!revealedLogin} onOpenChange={(open) => !open && setRevealedLogin(null)}>
        <DialogContent className="border-border bg-surface text-foreground">
          <DialogHeader>
            <DialogTitle>Login created</DialogTitle>
          </DialogHeader>
          {revealedLogin && (
            <div className="space-y-4">
              <p className="text-sm text-muted-text">
                Give these credentials to <span className="font-medium text-foreground">{revealedLogin.name}</span> in person.
                The password is shown once — it can't be retrieved again after you close this.
              </p>
              <div className="space-y-3 rounded-xl border border-border bg-canvas p-3">
                <div>
                  <Label className="mb-1 block text-[11px] text-muted-text">Email</Label>
                  <p className="text-sm font-medium text-foreground">{revealedLogin.email}</p>
                </div>
                <div>
                  <Label htmlFor="revealed-temp-password" className="mb-1 block text-[11px] text-muted-text">Temporary password</Label>
                  <div className="flex items-center gap-2">
                    <Input id="revealed-temp-password" readOnly value={revealedLogin.tempPassword} className="border-border bg-surface font-mono" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 border-border"
                      aria-label="Copy password"
                      onClick={() => {
                        navigator.clipboard.writeText(revealedLogin.tempPassword)
                        toast.success('Password copied')
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
