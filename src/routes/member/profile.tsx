import { createFileRoute, useBlocker } from '@tanstack/react-router'
import * as React from 'react'
import { toast } from '#/lib/toast'
import {
  Car,
  Heart,
  PhoneCall,
  Shield,
  SlidersHorizontal,
  User as UserIcon,
} from 'lucide-react'
import { PageHeader } from '#/components/stayflow/page-header'
import { UserAvatar } from '#/components/stayflow/user-avatar'
import { ChangePasswordForm } from '#/components/stayflow/change-password-form'
import { AvatarDialog } from '#/components/stayflow/profile/avatar-dialog'
import { EmailSection } from '#/components/stayflow/profile/email-section'
import { PersonalTab } from '#/components/stayflow/profile/personal-tab'
import { FamilyTab } from '#/components/stayflow/profile/family-tab'
import { VehicleTab } from '#/components/stayflow/profile/vehicle-tab'
import { EmergencyTab } from '#/components/stayflow/profile/emergency-tab'
import { PreferencesTab } from '#/components/stayflow/profile/preferences-tab'
import {
  computeErrors,
  errText,
  monthYear,
  tabTrigger,
} from '#/components/stayflow/profile/profile-helpers'
import type { ProfileErrors } from '#/components/stayflow/profile/profile-helpers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Button } from '#/components/ui/button'
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
import { tierLabel, updateMyProfile } from '#/lib/api/resident'
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
    keys: (keyof ProfileErrors)[],
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
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <PersonalTab
            form={form}
            setForm={setForm}
            errors={errors}
            saving={saving}
            dirty={dirty.personal}
            save={save}
          />
        </TabsContent>

        <TabsContent
          value="family"
          className="space-y-3 rounded-2xl border border-border bg-surface p-5"
        >
          <FamilyTab profile={profile} onSaved={setProfile} />
        </TabsContent>

        <TabsContent
          value="vehicles"
          className="space-y-3 rounded-2xl border border-border bg-surface p-5"
        >
          <VehicleTab profile={profile} onSaved={setProfile} />
        </TabsContent>

        <TabsContent
          value="emergency"
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <EmergencyTab
            form={form}
            setForm={setForm}
            errors={errors}
            saving={saving}
            dirty={dirty.emergency}
            save={save}
          />
        </TabsContent>

        <TabsContent
          value="preferences"
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <PreferencesTab
            form={form}
            setForm={setForm}
            errors={errors}
            saving={saving}
            dirty={dirty.prefs}
            save={save}
          />
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
