import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '#/components/stayflow/app-shell'
import { getStaffById } from '#/lib/mock/staff'
import { CURRENT_STAFF_ID } from '#/lib/session'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'

export const Route = createFileRoute('/staff')({
  component: StaffLayout,
})

function StaffLayout() {
  const ready = useRequireAuth('staff')
  const member = getStaffById(CURRENT_STAFF_ID)

  if (!ready) return null

  return (
    <AppShell portal="staff" identityName={member?.name ?? 'Staff'} identitySubtitle={member?.role ?? ''}>
      <Outlet />
    </AppShell>
  )
}
