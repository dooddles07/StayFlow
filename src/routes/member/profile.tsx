import { createFileRoute } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from 'sonner'
import { Car, Heart, Shield, SlidersHorizontal, User as UserIcon } from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { AvatarInitials } from '#/components/stayflow/avatar-initials'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import { useMockStore } from '#/lib/store/mock-store'
import { CURRENT_RESIDENT_ID } from '#/lib/session'

export const Route = createFileRoute('/member/profile')({
  head: () => ({ meta: [{ title: 'Profile — StayFlow Member' }] }),
  component: ProfilePage,
})

function ProfilePage() {
  const { state, dispatch } = useMockStore()
  const resident = state.residents.find((r) => r.id === CURRENT_RESIDENT_ID)
  const [form, setForm] = React.useState(resident)

  React.useEffect(() => {
    setForm(resident)
  }, [resident])

  if (!form) return null

  function save(message: string) {
    if (!form) return
    dispatch({ type: 'UPDATE_RESIDENT', payload: form })
    toast.success(message)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Account" title="Profile" description="Manage your personal information and preferences." />

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        <AvatarInitials seed={form.name} className="size-14" />
        <div>
          <p className="text-base font-semibold text-foreground">{form.name}</p>
          <p className="text-sm text-muted-text">{form.unit} · {form.tier} Member</p>
        </div>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="mb-6 flex-wrap bg-surface">
          <TabsTrigger value="personal" className="gap-1.5 data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            <UserIcon className="size-3.5" /> Personal
          </TabsTrigger>
          <TabsTrigger value="family" className="gap-1.5 data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            <Heart className="size-3.5" /> Family
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-1.5 data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            <Car className="size-3.5" /> Vehicles
          </TabsTrigger>
          <TabsTrigger value="emergency" className="gap-1.5 data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            <Shield className="size-3.5" /> Emergency
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5 data-[state=active]:bg-accent-indigo/20 data-[state=active]:text-accent-gold">
            <SlidersHorizontal className="size-3.5" /> Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 text-xs text-muted-text">Full name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-border bg-canvas" />
            </div>
            <div>
              <Label className="mb-1.5 text-xs text-muted-text">Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="border-border bg-canvas" />
            </div>
            <div>
              <Label className="mb-1.5 text-xs text-muted-text">Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-border bg-canvas" />
            </div>
            <div>
              <Label className="mb-1.5 text-xs text-muted-text">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border-border bg-canvas" />
            </div>
          </div>
          <Button onClick={() => save('Personal details saved')} className="bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Save Changes
          </Button>
        </TabsContent>

        <TabsContent value="family" className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          {form.family.length === 0 ? (
            <p className="text-sm text-muted-text">No family members added yet.</p>
          ) : (
            form.family.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-border bg-canvas px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-text">{member.relation}</p>
                </div>
                <p className="text-xs text-muted-text">Age {member.age}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-3 rounded-2xl border border-border bg-surface p-5">
          {form.vehicles.length === 0 ? (
            <p className="text-sm text-muted-text">No vehicles registered.</p>
          ) : (
            form.vehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center justify-between rounded-xl border border-border bg-canvas px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-xs text-muted-text">{vehicle.color}</p>
                </div>
                <p className="text-xs font-medium text-accent-gold">{vehicle.plate}</p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 text-xs text-muted-text">Contact name</Label>
              <Input
                value={form.emergencyContact.name}
                onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })}
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-xs text-muted-text">Relation</Label>
              <Input
                value={form.emergencyContact.relation}
                onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relation: e.target.value } })}
                className="border-border bg-canvas"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="mb-1.5 text-xs text-muted-text">Phone</Label>
              <Input
                value={form.emergencyContact.phone}
                onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })}
                className="border-border bg-canvas"
              />
            </div>
          </div>
          <Button onClick={() => save('Emergency contact saved')} className="bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Save Changes
          </Button>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-5 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Push notifications</p>
              <p className="text-xs text-muted-text">Booking updates, guest arrivals, and reminders.</p>
            </div>
            <Switch
              checked={form.preferences.notifications}
              onCheckedChange={(checked) => setForm({ ...form, preferences: { ...form.preferences, notifications: checked } })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Community newsletter</p>
              <p className="text-xs text-muted-text">Monthly digest of events and announcements.</p>
            </div>
            <Switch
              checked={form.preferences.newsletter}
              onCheckedChange={(checked) => setForm({ ...form, preferences: { ...form.preferences, newsletter: checked } })}
            />
          </div>
          <div>
            <Label className="mb-1.5 text-xs text-muted-text">Dietary preferences</Label>
            <p className="text-sm text-foreground">
              {form.preferences.dietary.length > 0 ? form.preferences.dietary.join(', ') : 'None specified'}
            </p>
          </div>
          <Button onClick={() => save('Preferences saved')} className="bg-accent-indigo text-white hover:bg-accent-indigo-soft">
            Save Changes
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
