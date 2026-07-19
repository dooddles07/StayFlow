import * as React from 'react'
import { ApiError } from '#/lib/api/client'
import { getMyProfile, type ResidentProfile } from '#/lib/api/resident'

// 'no-resident' = the account authenticated fine but has no resident record linked
// (404 from /residents/me) — a setup problem, not a transient failure, so it's kept
// distinct from 'error' and never worth retrying the same way.
type ProfileStatus = 'loading' | 'ready' | 'error' | 'no-resident'

interface MemberProfileContextValue {
  profile: ResidentProfile | null
  status: ProfileStatus
  setProfile: (profile: ResidentProfile) => void
  reload: () => void
}

const MemberProfileContext = React.createContext<MemberProfileContextValue | null>(null)

export function MemberProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = React.useState<ResidentProfile | null>(null)
  const [status, setStatus] = React.useState<ProfileStatus>('loading')

  const load = React.useCallback(() => {
    let active = true
    setStatus('loading')
    getMyProfile()
      .then((data) => {
        if (!active) return
        setProfile(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (!active) return
        setStatus(err instanceof ApiError && err.status === 404 ? 'no-resident' : 'error')
      })
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => load(), [load])

  const value = React.useMemo<MemberProfileContextValue>(
    () => ({ profile, status, setProfile, reload: load }),
    [profile, status, load],
  )

  return <MemberProfileContext.Provider value={value}>{children}</MemberProfileContext.Provider>
}

export function useMyProfile(): MemberProfileContextValue {
  const ctx = React.useContext(MemberProfileContext)
  if (!ctx) throw new Error('useMyProfile must be used within MemberProfileProvider')
  return ctx
}
