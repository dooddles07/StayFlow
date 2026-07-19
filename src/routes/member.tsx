import { createFileRoute, Outlet } from '@tanstack/react-router'
import * as React from 'react'
import { AppShell } from '#/components/stayflow/app-shell'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'
import { MemberProfileProvider, useMyProfile } from '#/lib/store/member-profile'
import { getNotices } from '#/lib/api/notice'

export const Route = createFileRoute('/member')({
  component: MemberLayout,
})

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
