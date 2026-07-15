import * as React from 'react'

export type Portal = 'member' | 'staff' | 'management'

const STORAGE_KEY = 'stayflow.last-portal'

export function getStoredPortal(): Portal | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  if (value === 'member' || value === 'staff' || value === 'management') return value
  return null
}

export function setStoredPortal(portal: Portal) {
  window.localStorage.setItem(STORAGE_KEY, portal)
}

export function clearStoredPortal() {
  window.localStorage.removeItem(STORAGE_KEY)
}

export function usePortalPreference() {
  const [portal, setPortalState] = React.useState<Portal | null>(null)

  React.useEffect(() => {
    setPortalState(getStoredPortal())
  }, [])

  const setPortal = React.useCallback((next: Portal) => {
    setStoredPortal(next)
    setPortalState(next)
  }, [])

  return { portal, setPortal }
}
