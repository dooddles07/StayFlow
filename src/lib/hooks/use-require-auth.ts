import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { isPortalRoleMatch, useAuthStore } from '#/lib/store/auth-store'
import type { Portal } from '#/lib/hooks/use-portal-preference'

export function useRequireAuth(portal: Portal) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [checked, setChecked] = React.useState(false)

  React.useEffect(() => {
    if (!user || !isPortalRoleMatch(user.role, portal)) {
      navigate({ to: `/login/${portal}`, replace: true })
      return
    }
    setChecked(true)
  }, [user, portal, navigate])

  return checked
}
