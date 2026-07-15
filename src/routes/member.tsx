import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '#/components/stayflow/app-shell'
import { getResidentById } from '#/lib/mock/residents'
import { CURRENT_RESIDENT_ID } from '#/lib/session'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'

export const Route = createFileRoute('/member')({
  component: MemberLayout,
})

function MemberLayout() {
  const ready = useRequireAuth('member')
  const resident = getResidentById(CURRENT_RESIDENT_ID)

  if (!ready) return null

  return (
    <AppShell portal="member" identityName={resident?.name ?? 'Member'} identitySubtitle={resident?.unit ?? ''}>
      <Outlet />
    </AppShell>
  )
}
