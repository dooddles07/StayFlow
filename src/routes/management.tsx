import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '#/components/stayflow/app-shell'
import { CURRENT_MANAGER_NAME, CURRENT_MANAGER_TITLE } from '#/lib/session'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'

export const Route = createFileRoute('/management')({
  component: ManagementLayout,
})

function ManagementLayout() {
  const ready = useRequireAuth('management')

  if (!ready) return null

  return (
    <AppShell portal="management" identityName={CURRENT_MANAGER_NAME} identitySubtitle={CURRENT_MANAGER_TITLE}>
      <Outlet />
    </AppShell>
  )
}
