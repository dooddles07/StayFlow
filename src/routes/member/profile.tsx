import { createFileRoute, useBlocker } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from '#/lib/toast'
import {
  Car,
  Heart,
  Pencil,
  PhoneCall,
  Plus,
  Shield,
  SlidersHorizontal,
  User as UserIcon,
  X,
} from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { UserAvatar } from '#/components/stayflow/user-avatar'
import { ChangePasswordForm } from '#/components/stayflow/change-password-form'
import { AvatarDialog } from '#/components/stayflow/profile/avatar-dialog'
import { FamilyDialog } from '#/components/stayflow/profile/family-dialog'
import { VehicleDialog } from '#/components/stayflow/profile/vehicle-dialog'
import { DeleteButton } from '#/components/stayflow/profile/delete-button'
import { EmailSection } from '#/components/stayflow/profile/email-section'
import {
  FieldError,
  computeErrors,
  errText,
  monthYear,
  tabTrigger,
} from '#/components/stayflow/profile/profile-helpers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
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
import {
  removeFamilyMember,
  removeVehicle,
  tierLabel,
  updateMyProfile,
} from '#/lib/api/resident'
import type { ResidentProfile, ResidentProfileUpdate } from '#/lib/api/resident'
import { useMyProfile } from '#/lib/store/member-profile'

export const Route = createFileRoute('/member/profile')({
  head: () => ({ meta: [{ title: 'Profile — StayFlow Member' }] }),
  component: ProfilePage,
})

function ProfilePage() {
  const { profile, status, setProfile } = useMyProfile()
  const [form, setForm] = React.useState<ResidentProfile | null>(null)
  const [saving, setSaving] = React.useState(false)
  // Mirrors saving but checked/updated synchronously — two clicks before React re-renders
  // (and disables the button) would both read the same stale false and both fire.
  const savingRef = React.useRef(false)
  const [dietaryInput, setDietaryInput] = React.useState('')

  // Sync the editable copy when the identity loads/changes — but not on every
  // child mutation, so unsaved text edits aren't clobbered by a family/vehicle save.
  React.useEffect(() => {
    if (profile) setForm(profile)
  }, [profile?.id])

  const dirty =
    form && profile
      ? {
          personal: form.name !== profile.name || form.phone !== profile.phone,
          emergency:
            form.emergencyContact.name !== profile.emergencyContact.name ||
            form.emergencyContact.relation !==
              profile.emergencyContact.relation ||
            form.emergencyContact.phone !== profile.emergencyContact.phone ||
            form.emergencyContact2.name !== profile.emergencyContact2.name ||
            form.emergencyContact2.relation !==
              profile.emergencyContact2.relation ||
            form.emergencyContact2.phone !== profile.emergencyContact2.phone,
          prefs:
            form.preferences.notifications !==
              profile.preferences.notifications ||
            form.preferences.newsletter !== profile.preferences.newsletter ||
            form.preferences.dietary.join('|') !==
              profile.preferences.dietary.join('|'),
        }
      : { personal: false, emergency: false, prefs: false }
  const isDirty = dirty.personal || dirty.emergency || dirty.prefs

  // Guard against losing unsaved edits: block in-app navigation (styled prompt via
  // resolver) and warn the browser on tab close / refresh.
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  })

  // Each tab sends only the fields it owns and validates only its own keys, so saving
  // one tab can never persist another tab's unsaved (or invalid) edits.
  async function save(
    patch: Partial<ResidentProfileUpdate>,
    message: string,
    keys: (keyof ReturnType<typeof computeErrors>)[],
  ) {
    if (!form || savingRef.current) return
    const errs = computeErrors(form)
    if (keys.some((k) => errs[k])) {
      toast.error('Fix the highlighted fields before saving.')
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    savingRef.current = true
    setSaving(true)
    try {
      const updated = await updateMyProfile(patch)
      setProfile(updated)
      setForm(updated)
      toast.success(message)
    } catch (err) {
      toast.error(errText(err))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (status === 'loading' || (status === 'ready' && !form)) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Account"
          title="Profile"
          description="Manage your personal information and preferences."
        />
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-2xl border border-border bg-surface" />
          <div className="h-10 w-full max-w-md rounded-xl bg-surface" />
          <div className="h-64 rounded-2xl border border-border bg-surface" />
        </div>
      </div>
    )
  }

  if (status === 'error' || !form || !profile) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Account"
          title="Profile"
          description="Manage your personal information and preferences."
        />
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted-text">
            We couldn't load your profile right now.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const errors = computeErrors(form)

  function addDietary() {
    if (!form) return
    const value = dietaryInput.trim()
    if (!value) return
    if (
      form.preferences.dietary.some(
        (d) => d.toLowerCase() === value.toLowerCase(),
      )
    ) {
      setDietaryInput('')
      return
    }
    setForm({
      ...form,
      preferences: {
        ...form.preferences,
        dietary: [...form.preferences.dietary, value],
      },
    })
    setDietaryInput('')
  }

  function removeDietary(tag: string) {
    if (!form) return
    setForm({
      ...form,
      preferences: {
        ...form.preferences,
        dietary: form.preferences.dietary.filter((d) => d !== tag),
      },
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Manage your personal information and preferences."
      />

      <AlertDialog open={blocker.status === 'blocked'}>
        <AlertDialogContent className="border-border bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have edits that haven't been saved. Leaving now will lose
              them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-border"
              onClick={() => blocker.reset?.()}
            >
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => blocker.proceed?.()}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        <UserAvatar
          seed={form.avatarSeed}
          style={form.avatarStyle}
          name={form.name}
          className="size-14"
        />
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground">{form.name}</p>
          <p className="text-sm text-muted-text">
            {form.unit} · {tierLabel(form.tier)} Member
          </p>
          {monthYear(form.moveInDate) && (
            <p className="text-xs text-muted-text">
              Member since {monthYear(form.moveInDate)}
            </p>
          )}
        </div>
        <div className="ml-auto">
          <AvatarDialog
            seed={form.avatarSeed}
            style={form.avatarStyle}
            name={form.name}
            onSaved={(p) => {
              setProfile(p)
              setForm((prev) =>
                prev
                  ? {
                      ...prev,
                      avatarSeed: p.avatarSeed,
                      avatarStyle: p.avatarStyle,
                    }
                  : p,
              )
            }}
          />
        </div>
      </div>

      <Tabs defaultValue="personal">
        <TabsList className="mb-6 flex h-auto w-full justify-start gap-1 overflow-x-auto bg-surface p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="personal" className={tabTrigger}>
            <UserIcon className="size-3.5" /> Personal
          </TabsTrigger>
          <TabsTrigger value="family" className={tabTrigger}>
            <Heart className="size-3.5" /> Family
          </TabsTrigger>
          <TabsTrigger value="vehicles" className={tabTrigger}>
            <Car className="size-3.5" /> Vehicles
          </TabsTrigger>
          <TabsTrigger value="emergency" className={tabTrigger}>
            <PhoneCall className="size-3.5" /> Emergency
          </TabsTrigger>
          <TabsTrigger value="preferences" className={tabTrigger}>
            <SlidersHorizontal className="size-3.5" /> Preferences
          </TabsTrigger>
          <TabsTrigger value="security" className={tabTrigger}>
            <Shield className="size-3.5" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="personal"
          className="space-y-4 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="profile-name"
                className="mb-1.5 text-xs text-muted-text"
              >
                Full name
              </Label>
              <Input
                id="profile-name"
                value={form.name}
                aria-invalid={!!errors.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-border bg-canvas"
              />
              <FieldError msg={errors.name} />
            </div>
            <div>
              <Label
                htmlFor="profile-unit"
                className="mb-1.5 text-xs text-muted-text"
              >
                Unit
              </Label>
              <Input
                id="profile-unit"
                value={form.unit}
                readOnly
                disabled
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="profile-email"
                className="mb-1.5 text-xs text-muted-text"
              >
                Email
              </Label>
              <Input
                id="profile-email"
                value={form.email}
                readOnly
                disabled
                className="border-border bg-canvas"
              />
            </div>
            <div>
              <Label
                htmlFor="profile-phone"
                className="mb-1.5 text-xs text-muted-text"
              >
                Phone
              </Label>
              <Input
                id="profile-phone"
                value={form.phone}
                aria-invalid={!!errors.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="border-border bg-canvas"
              />
              <FieldError msg={errors.phone} />
            </div>
          </div>
          <Button
            onClick={() =>
              save(
                { name: form.name.trim(), phone: form.phone.trim() },
                'Personal details saved',
                ['name', 'phone'],
              )
            }
            disabled={
              saving || !dirty.personal || !!errors.name || !!errors.phone
            }
            className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </TabsContent>

        <TabsContent
          value="family"
          className="space-y-3 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Family members
            </p>
            <FamilyDialog
              onSaved={setProfile}
              trigger={
                <Button
                  size="sm"
                  className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
                >
                  <Plus className="size-4" /> Add
                </Button>
              }
            />
          </div>
          {profile.family.length === 0 ? (
            <p className="text-sm text-muted-text">
              No family members added yet.
            </p>
          ) : (
            profile.family.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-xl border border-border bg-canvas px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.name}
                  </p>
                  <p className="text-xs text-muted-text">
                    {member.relation} · Age {member.age}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <FamilyDialog
                    initial={member}
                    onSaved={setProfile}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 text-muted-text hover:text-foreground"
                        aria-label={`Edit ${member.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <DeleteButton
                    label={member.name}
                    onConfirm={() =>
                      removeFamilyMember(member.id).then(setProfile)
                    }
                  />
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent
          value="vehicles"
          className="space-y-3 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Registered vehicles
            </p>
            <VehicleDialog
              onSaved={setProfile}
              trigger={
                <Button
                  size="sm"
                  className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
                >
                  <Plus className="size-4" /> Add
                </Button>
              }
            />
          </div>
          {profile.vehicles.length === 0 ? (
            <p className="text-sm text-muted-text">No vehicles registered.</p>
          ) : (
            profile.vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between rounded-xl border border-border bg-canvas px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-xs text-muted-text">{vehicle.color}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-accent-gold">
                    {vehicle.plate}
                  </p>
                  <VehicleDialog
                    initial={vehicle}
                    onSaved={setProfile}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 text-muted-text hover:text-foreground"
                        aria-label={`Edit ${vehicle.make} ${vehicle.model}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                  <DeleteButton
                    label={`${vehicle.make} ${vehicle.model}`}
                    onConfirm={() => removeVehicle(vehicle.id).then(setProfile)}
                  />
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent
          value="emergency"
          className="space-y-4 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label
                htmlFor="emergency-name"
                className="mb-1.5 text-xs text-muted-text"
              >
                Contact name
              </Label>
              <Input
                id="emergency-name"
                value={form.emergencyContact.name}
                aria-invalid={!!errors.emName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    emergencyContact: {
                      ...form.emergencyContact,
                      name: e.target.value,
                    },
                  })
                }
                className="border-border bg-canvas"
              />
              <FieldError msg={errors.emName} />
            </div>
            <div>
              <Label
                htmlFor="emergency-relation"
                className="mb-1.5 text-xs text-muted-text"
              >
                Relation
              </Label>
              <Input
                id="emergency-relation"
                value={form.emergencyContact.relation}
                aria-invalid={!!errors.emRelation}
                onChange={(e) =>
                  setForm({
                    ...form,
                    emergencyContact: {
                      ...form.emergencyContact,
                      relation: e.target.value,
                    },
                  })
                }
                className="border-border bg-canvas"
              />
              <FieldError msg={errors.emRelation} />
            </div>
            <div className="sm:col-span-2">
              <Label
                htmlFor="emergency-phone"
                className="mb-1.5 text-xs text-muted-text"
              >
                Phone
              </Label>
              <Input
                id="emergency-phone"
                value={form.emergencyContact.phone}
                aria-invalid={!!errors.emPhone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    emergencyContact: {
                      ...form.emergencyContact,
                      phone: e.target.value,
                    },
                  })
                }
                className="border-border bg-canvas"
              />
              <FieldError msg={errors.emPhone} />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium text-foreground">
              Secondary contact{' '}
              <span className="font-normal text-muted-text">· optional</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label
                  htmlFor="emergency2-name"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Contact name
                </Label>
                <Input
                  id="emergency2-name"
                  value={form.emergencyContact2.name}
                  aria-invalid={!!errors.em2Name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact2: {
                        ...form.emergencyContact2,
                        name: e.target.value,
                      },
                    })
                  }
                  className="border-border bg-canvas"
                />
                <FieldError msg={errors.em2Name} />
              </div>
              <div>
                <Label
                  htmlFor="emergency2-relation"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Relation
                </Label>
                <Input
                  id="emergency2-relation"
                  value={form.emergencyContact2.relation}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact2: {
                        ...form.emergencyContact2,
                        relation: e.target.value,
                      },
                    })
                  }
                  className="border-border bg-canvas"
                />
              </div>
              <div className="sm:col-span-2">
                <Label
                  htmlFor="emergency2-phone"
                  className="mb-1.5 text-xs text-muted-text"
                >
                  Phone
                </Label>
                <Input
                  id="emergency2-phone"
                  value={form.emergencyContact2.phone}
                  aria-invalid={!!errors.em2Phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      emergencyContact2: {
                        ...form.emergencyContact2,
                        phone: e.target.value,
                      },
                    })
                  }
                  className="border-border bg-canvas"
                />
                <FieldError msg={errors.em2Phone} />
              </div>
            </div>
          </div>

          <Button
            onClick={() =>
              save(
                {
                  emergencyName: form.emergencyContact.name.trim(),
                  emergencyRelation: form.emergencyContact.relation.trim(),
                  emergencyPhone: form.emergencyContact.phone.trim(),
                  emergency2Name: form.emergencyContact2.name.trim(),
                  emergency2Relation: form.emergencyContact2.relation.trim(),
                  emergency2Phone: form.emergencyContact2.phone.trim(),
                },
                'Emergency contact saved',
                ['emName', 'emRelation', 'emPhone', 'em2Name', 'em2Phone'],
              )
            }
            disabled={
              saving ||
              !dirty.emergency ||
              !!errors.emName ||
              !!errors.emRelation ||
              !!errors.emPhone ||
              !!errors.em2Name ||
              !!errors.em2Phone
            }
            className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </TabsContent>

        <TabsContent
          value="preferences"
          className="space-y-5 rounded-2xl border border-border bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Push notifications
              </p>
              <p className="text-xs text-muted-text">
                Booking updates, guest arrivals, and reminders.
              </p>
            </div>
            <Switch
              checked={form.preferences.notifications}
              onCheckedChange={(checked) =>
                setForm({
                  ...form,
                  preferences: { ...form.preferences, notifications: checked },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Community newsletter
              </p>
              <p className="text-xs text-muted-text">
                Monthly digest of events and announcements.
              </p>
            </div>
            <Switch
              checked={form.preferences.newsletter}
              onCheckedChange={(checked) =>
                setForm({
                  ...form,
                  preferences: { ...form.preferences, newsletter: checked },
                })
              }
            />
          </div>
          <div>
            <Label
              htmlFor="dietary-input"
              className="mb-1.5 text-xs text-muted-text"
            >
              Dietary preferences
            </Label>
            {form.preferences.dietary.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {form.preferences.dietary.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-indigo/15 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeDietary(tag)}
                      aria-label={`Remove ${tag}`}
                      className="-m-1.5 flex size-7 items-center justify-center rounded-full text-muted-text transition-colors hover:text-red-500"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                id="dietary-input"
                value={dietaryInput}
                placeholder="e.g. Vegetarian, Gluten-free"
                onChange={(e) => setDietaryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addDietary()
                  }
                }}
                className="border-border bg-canvas"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addDietary}
                className="border-border"
              >
                Add
              </Button>
            </div>
          </div>
          <Button
            onClick={() =>
              save(
                {
                  notifications: form.preferences.notifications,
                  newsletter: form.preferences.newsletter,
                  dietary: form.preferences.dietary,
                },
                'Preferences saved',
                [],
              )
            }
            disabled={saving || !dirty.prefs}
            className="bg-accent-indigo text-white hover:bg-accent-indigo-soft"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </TabsContent>

        <TabsContent
          value="security"
          className="space-y-8 rounded-2xl border border-border bg-surface p-5"
        >
          <EmailSection />
          <div className="border-t border-border" />
          <ChangePasswordForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
