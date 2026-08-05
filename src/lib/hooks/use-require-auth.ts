import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { isPortalRoleMatch, useAuthStore } from '#/lib/store/auth-store'
import type { Portal } from '#/lib/hooks/use-portal-preference'

export function useRequireAuth(portal: Portal) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const revalidated = useAuthStore((s) => s.revalidated)
  const revalidate = useAuthStore((s) => s.revalidate)
  const [checked, setChecked] = React.useState(false)

  // Ask the server who this session belongs to, once per page load. Until it
  // answers, the only thing the shell knows about the user is what localStorage
  // claims, and that is editable.
  React.useEffect(() => {
    if (!hasHydrated || revalidated || !user) return
    void revalidate()
  }, [hasHydrated, revalidated, user, revalidate])

  React.useEffect(() => {
    if (!hasHydrated) return

    if (!user || !isPortalRoleMatch(user.role, portal)) {
      navigate({ to: `/login/${portal}`, replace: true })
      return
    }
    setChecked(true)
  }, [user, hasHydrated, portal, navigate])

  return checked
}
