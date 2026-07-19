import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ShieldAlert } from 'lucide-react'
import { AppShell } from '#/components/stayflow/app-shell'
import { Button } from '#/components/ui/button'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'
import { MemberProfileProvider, useMyProfile } from '#/lib/store/member-profile'
import { getNotices } from '#/lib/api/notice'
import { useAuthStore } from '#/lib/store/auth-store'
import { clearStoredPortal } from '#/lib/hooks/use-portal-preference'

export const Route = createFileRoute('/member')({
  component: MemberLayout,
})

// The account authenticated fine but has no resident record linked — nothing in the
// portal can load (every panel needs a residentId), and retrying never helps since
// this is a setup problem, not a network blip. Say so plainly instead of leaving the
// user staring at a wall of "couldn't load" panels with dead retry buttons.
function NoResidentLinked() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-lg">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-gold/15 text-accent-gold">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Account not set up yet</h1>
        <p className="mt-2 text-sm text-muted-text">
          Your login works, but it isn't linked to a resident profile yet. Contact building management to finish setting up your account.
        </p>
        <Button
          onClick={async () => {
            await logout()
            clearStoredPortal()
            navigate({ to: '/login/member' })
          }}
          className="mt-6 w-full bg-accent-indigo text-white hover:bg-accent-indigo-soft"
        >
          Log out
        </Button>
      </div>
    </div>
  )
}

function MemberShell() {
  const { profile, status } = useMyProfile()
  const [hasUnreadNotices, setHasUnreadNotices] = React.useState(false)

  React.useEffect(() => {
    if (!profile) return
    let active = true
    const seen = profile.noticesLastSeenAt
    const check = () =>
      getNotices()
        .then((notices) => {
          if (!active) return
          setHasUnreadNotices(notices.some((n) => seen === null || n.postedAt > seen))
        })
        .catch(() => {})
    check()
    // Poll so a freshly posted notice lights the badge without a full page reload.
    const timer = setInterval(check, 60_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [profile])

  if (status === 'no-resident') return <NoResidentLinked />

  return (
    <AppShell
      portal="member"
      identityName={profile?.name ?? 'Member'}
      identitySubtitle={profile?.unit ?? ''}
      identityLoading={status === 'loading'}
      avatarSeed={profile?.avatarSeed}
      avatarStyle={profile?.avatarStyle}
      navBadges={{ '/member/notices': hasUnreadNotices }}
    >
      <Outlet />
    </AppShell>
  )
}

function MemberLayout() {
  const ready = useRequireAuth('member')

  if (!ready) return null

  return (
    <MemberProfileProvider>
      <MemberShell />
    </MemberProfileProvider>
  )
}
