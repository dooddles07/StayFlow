import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '#/components/stayflow/app-shell'
import { RoutePending } from '#/components/stayflow/route-pending'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'
import { useAuthStore } from '#/lib/store/auth-store'
import { NOINDEX_META } from '#/lib/seo'

export const Route = createFileRoute('/staff')({
  head: () => ({ meta: [...NOINDEX_META] }),
  component: StaffLayout,
})

function StaffLayout() {
  const ready = useRequireAuth('staff')
  const user = useAuthStore((s) => s.user)

  if (!ready) return <RoutePending />

  return (
    <AppShell
      portal="staff"
      identityName={user?.displayName ?? 'Staff'}
      identitySubtitle={user?.staff?.role ?? 'Staff'}
      avatarSeed={user?.staff?.avatarSeed}
    >
      <Outlet />
    </AppShell>
  )
}
