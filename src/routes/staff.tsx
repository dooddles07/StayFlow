import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { hasSessionCookie } from '#/lib/auth-guard'
import { AppShell } from '#/components/stayflow/app-shell'
import { RoutePending } from '#/components/stayflow/route-pending'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'
import { useAuthStore } from '#/lib/store/auth-store'
import { NOINDEX_META } from '#/lib/seo'

export const Route = createFileRoute('/staff')({
  // See the note in management.tsx — server-side cookie gate, client no-op.
  beforeLoad: () => {
    if (!hasSessionCookie()) {
      throw redirect({ to: '/login/staff', replace: true })
    }
  },
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
