import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from '#/lib/toast'
import { api, ApiError, setUnauthorizedHandler } from '#/lib/api/client'
import type { Portal } from '#/lib/hooks/use-portal-preference'

export type PortalRole = 'MEMBER' | 'STAFF' | 'MANAGEMENT'

export const roleToPortal: Record<PortalRole, Portal> = {
  MEMBER: 'member',
  STAFF: 'staff',
  MANAGEMENT: 'management',
}

interface AuthUser {
  id: string
  email: string
  role: PortalRole
  displayName: string
  // True until a MANAGEMENT-issued temp password is replaced with the resident's own —
  // see the forced-change gate in src/routes/member.tsx.
  mustChangePassword: boolean
  // Present when role === 'STAFF' — the login/me endpoints include this relation.
  staff?: { id: string; role: string; avatarSeed: string } | null
  // Present when role === 'MEMBER' — same endpoints include this relation too.
  resident?: { id: string } | null
}

interface LoginResponse {
  user: AuthUser
}

interface AuthState {
  user: AuthUser | null
  hasHydrated: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>
  requestEmailChange: (
    newEmail: string,
    currentPassword: string,
  ) => Promise<string>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      // The JWT lives in an httpOnly cookie set by the server — never stored in JS.
      // Only the non-sensitive user profile is persisted, purely for portal-gating UX.
      login: async (email, password) => {
        const { user } = await api.post<LoginResponse>('/auth/login', {
          email,
          password,
        })
        set({ user })
        return user
      },
      logout: async () => {
        try {
          await api.post('/auth/logout', {})
        } catch {
          // Clear local state regardless of network outcome.
        }
        set({ user: null })
      },
      changePassword: async (currentPassword, newPassword) => {
        // Server rotates the password and re-issues this session's cookie; other sessions are revoked.
        await api.post('/auth/change-password', {
          currentPassword,
          newPassword,
        })
        // Clears mustChangePassword locally so the forced-change gate lifts immediately,
        // without waiting on a reload or a fresh /auth/me fetch.
        set((state) =>
          state.user
            ? { user: { ...state.user, mustChangePassword: false } }
            : state,
        )
      },
      requestEmailChange: async (newEmail, currentPassword) => {
        // Server emails a verification link to the new address; nothing changes until it's opened.
        const { message } = await api.post<{ message: string }>(
          '/auth/change-email',
          { newEmail, currentPassword },
        )
        return message
      },
    }),
    {
      name: 'stayflow.auth',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true
      },
    },
  ),
)

export function isPortalRoleMatch(role: PortalRole, portal: Portal) {
  return roleToPortal[role] === portal
}

// A 401 while we believe there's an active session means the cookie died server-side
// (natural expiry, password changed elsewhere, account disabled) — without this, every
// panel on the page independently fails its fetch into a dead-end "couldn't load, retry"
// state instead of sending the user back to sign in. A 401 with no local user (e.g. a
// login-form typo) is normal and left for the caller to handle — never intercepted here.
let redirecting = false
setUnauthorizedHandler(() => {
  const { user } = useAuthStore.getState()
  if (!user || redirecting) return
  redirecting = true
  const portal = roleToPortal[user.role]
  useAuthStore.setState({ user: null })
  toast.error('Your session has expired. Sign in again to continue.')
  window.location.assign(`/login/${portal}`)
})

export { ApiError }
