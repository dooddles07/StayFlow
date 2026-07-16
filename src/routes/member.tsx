import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '#/components/stayflow/app-shell'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'
import { MemberProfileProvider, useMyProfile } from '#/lib/store/member-profile'

export const Route = createFileRoute('/member')({
  component: MemberLayout,
})

function MemberShell() {
  const { profile, status } = useMyProfile()

  return (
    <AppShell
      portal="member"
      identityName={profile?.name ?? 'Member'}
      identitySubtitle={profile?.unit ?? ''}
      identityLoading={status === 'loading'}
      avatarSeed={profile?.avatarSeed}
      avatarStyle={profile?.avatarStyle}
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
