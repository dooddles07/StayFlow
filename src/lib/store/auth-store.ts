import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, ApiError } from '#/lib/api/client'
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
}

interface LoginResponse {
  token: string
  user: AuthUser
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (email, password) => {
        const { token, user } = await api.post<LoginResponse>('/auth/login', { email, password })
        set({ token, user })
        return user
      },
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'stayflow.auth' },
  ),
)

export function isPortalRoleMatch(role: PortalRole, portal: Portal) {
  return roleToPortal[role] === portal
}

export { ApiError }
