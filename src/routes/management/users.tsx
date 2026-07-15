import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { AvatarInitials } from '#/components/stayflow/avatar-initials'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { useMockStore, genId } from '#/lib/store/mock-store'
import type { MembershipTier, Resident, StaffMember, StaffRole } from '#/lib/mock/types'

export const Route = createFileRoute('/management/users')({
  head: () => ({ meta: [{ title: 'Users — StayFlow Management' }] }),
  component: UsersPage,
})

const tiers: MembershipTier[] = ['Signature', 'Prestige', 'Elite']
const roles: StaffRole[] = ['Concierge', 'Facilities Manager', 'Guest Relations', 'Dining Manager', 'Security', 'Operations']

function UsersPage() {
  const { state, dispatch } = useMockStore()
  const [tab, setTab] = React.useState<'members' | 'staff'>('members')
  const [editingResident, setEditingResident] = React.useState<Resident | null>(null)
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<{ kind: 'resident' | 'staff'; id: string; name: string } | null>(null)

  function newResident(): Resident {
    return {
      id: genId('res'),
      name: '',
      email: '',
      phone: '',
      unit: '',
      tier: 'Signature',
      avatarSeed: genId('seed'),
      moveInDate: new Date().toISOString().slice(0, 10),
      family: [],
      vehicles: [],
      emergencyContact: { name: '', relation: '', phone: '' },
      preferences: { dietary: [], notifications: true, newsletter: true },
    }
  }

  function newStaff(): StaffMember {
    return { id: genId('stf'), name: '', role: 'Concierge', email: '', shift: 'Morning', avatarSeed: genId('seed') }
  }

  function saveResident(resident: Resident) {
    const exists = state.residents.some((r) => r.id === resident.id)
    dispatch({ type: exists ? 'UPDATE_RESIDENT' : 'ADD_RESIDENT', payload: resident })
    setEditingResident(null)
    toast.success(exists ? 'Member updated' : 'Member added')
  }

  function saveStaff(member: StaffMember) {
    const exists = state.staff.some((s) => s.id === member.id)
    if (exists) {
      dispatch({ type: 'UPDATE_STAFF', payload: member })
    } else {
      dispatch({ type: 'ADD_STAFF', payload: member })
    }
    setEditingStaff(null)
    toast.success(exists ? 'Staff updated' : 'Staff added')
  }

  function confirmDelete() {
    if (!deleteTarget) return
    if (deleteTarget.kind === 'resident') {
      dispatch({ type: 'DELETE_RESIDENT', payload: { id: deleteTarget.id } })
    } else {
      dispatch({ type: 'DELETE_STAFF', payload: { id: deleteTarget.id } })
    }
    toast.success(`${deleteTarget.name} removed`)
    setDeleteTarget(null)
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
            onClick={() => (tab === 'members' ? setEditingResident(newResident()) : setEditingStaff(newStaff()))}
          >
            <Plus className="size-4" />
            Add {tab === 'members' ? 'Member' : 'Staff'}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
        <TabsList className="bg-surface">
          <TabsTrigger value="members" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Members ({state.residents.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            Staff ({state.staff.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'members' ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {state.residents.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <AvatarInitials seed={r.name} className="size-8" />
                      <span className="font-medium text-foreground">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-text">{r.unit}</td>
                  <td className="px-4 py-3 text-muted-text">{r.tier}</td>
                  <td className="px-4 py-3 text-muted-text">{r.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Button size="icon" variant="ghost" className="size-7 text-muted-text hover:text-foreground" onClick={() => setEditingResident(r)}>
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
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
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
              {state.staff.map((s) => (
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
                      <Button size="icon" variant="ghost" className="size-7 text-muted-text hover:text-foreground" onClick={() => setEditingStaff(s)}>
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
      )}

      <Sheet open={!!editingResident} onOpenChange={(open) => !open && setEditingResident(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{state.residents.some((r) => r.id === editingResident?.id) ? 'Edit Member' : 'Add Member'}</SheetTitle>
          </SheetHeader>
          {editingResident && (
            <div className="space-y-4 px-4 pb-6">
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Name</Label>
                <Input value={editingResident.name} onChange={(e) => setEditingResident({ ...editingResident, name: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Email</Label>
                <Input value={editingResident.email} onChange={(e) => setEditingResident({ ...editingResident, email: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Unit</Label>
                <Input value={editingResident.unit} onChange={(e) => setEditingResident({ ...editingResident, unit: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Tier</Label>
                <Select value={editingResident.tier} onValueChange={(v) => setEditingResident({ ...editingResident, tier: v as MembershipTier })}>
                  <SelectTrigger className="border-border bg-canvas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {tiers.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => saveResident(editingResident)}>
                Save Member
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <SheetContent className="border-border bg-surface text-foreground">
          <SheetHeader>
            <SheetTitle className="text-foreground">{state.staff.some((s) => s.id === editingStaff?.id) ? 'Edit Staff' : 'Add Staff'}</SheetTitle>
          </SheetHeader>
          {editingStaff && (
            <div className="space-y-4 px-4 pb-6">
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Name</Label>
                <Input value={editingStaff.name} onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Email</Label>
                <Input value={editingStaff.email} onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })} className="border-border bg-canvas" />
              </div>
              <div>
                <Label className="mb-1.5 text-xs text-muted-text">Role</Label>
                <Select value={editingStaff.role} onValueChange={(v) => setEditingStaff({ ...editingStaff, role: v as StaffRole })}>
                  <SelectTrigger className="border-border bg-canvas">
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
                <Label className="mb-1.5 text-xs text-muted-text">Shift</Label>
                <Select value={editingStaff.shift} onValueChange={(v) => setEditingStaff({ ...editingStaff, shift: v as StaffMember['shift'] })}>
                  <SelectTrigger className="border-border bg-canvas">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-surface text-foreground">
                    {(['Morning', 'Afternoon', 'Night'] as const).map((sh) => (
                      <SelectItem key={sh} value={sh}>
                        {sh}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft" onClick={() => saveStaff(editingStaff)}>
                Save Staff
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
            <AlertDialogAction className="bg-rose-500 text-white hover:bg-rose-600" onClick={confirmDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
