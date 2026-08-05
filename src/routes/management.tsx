import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { hasSessionCookie } from '#/lib/auth-guard'
import { AppShell } from '#/components/stayflow/app-shell'
import { RoutePending } from '#/components/stayflow/route-pending'
import { useRequireAuth } from '#/lib/hooks/use-require-auth'
import { useAuthStore } from '#/lib/store/auth-store'
import { NOINDEX_META } from '#/lib/seo'

export const Route = createFileRoute('/management')({
  // Runs on the server for the initial request, where the httpOnly session
  // cookie is visible; on the client it is a no-op and useRequireAuth decides.
  beforeLoad: () => {
    if (!hasSessionCookie()) {
      throw redirect({ to: '/login/management', replace: true })
    }
  },
  head: () => ({ meta: [...NOINDEX_META] }),
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
