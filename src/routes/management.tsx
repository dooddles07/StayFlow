import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '#/components/stayflow/app-shell'
import { RoutePending } from '#/components/stayflow/route-pending'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'
import { useAuthStore } from '#/lib/store/auth-store'

export const Route = createFileRoute('/management')({
  component: ManagementLayout,
})

function ManagementLayout() {
  const ready = useRequireAuth('management')
  const user = useAuthStore((s) => s.user)

  if (!ready) return <RoutePending />

  // No per-manager title is modeled server-side (MANAGEMENT users have no linked profile
  // row), so the subtitle stays a generic role label rather than a fabricated title.
  return (
    <AppShell
      portal="management"
      identityName={user?.displayName ?? 'Management'}
      identitySubtitle="Management"
    >
      <Outlet />
    </AppShell>
  )
}
