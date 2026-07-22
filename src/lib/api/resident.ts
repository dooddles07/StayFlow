import { api } from './client'

export type ResidentTier = 'SIGNATURE' | 'PRESTIGE' | 'ELITE'

export interface ResidentFamilyMember {
  id: string
  name: string
  relation: string
  age: number
}

export interface ResidentVehicle {
  id: string
  make: string
  model: string
  plate: string
  color: string
}

// Flat shape returned by the API (mirrors the Prisma Resident row + relations).
interface ResidentApiResponse {
  id: string
  name: string
  email: string
  phone: string
  unit: string
  tier: ResidentTier
  avatarSeed: string
  avatarStyle: string | null
  moveInDate: string
  dietary: string[]
  notifications: boolean
  newsletter: boolean
  emergencyName: string
  emergencyRelation: string
  emergencyPhone: string
  emergency2Name: string | null
  emergency2Relation: string | null
  emergency2Phone: string | null
  noticesLastSeenAt: string | null
  family: ResidentFamilyMember[]
  vehicles: ResidentVehicle[]
  // Null until MANAGEMENT issues a login for this resident (see createResidentLogin).
  user: { id: string; mustChangePassword: boolean } | null
}

// View model the profile UI consumes (nested, matches the form structure).
export interface ResidentProfile {
  id: string
  name: string
  email: string
  phone: string
  unit: string
  tier: ResidentTier
  avatarSeed: string
  avatarStyle: string | null
  moveInDate: string
  noticesLastSeenAt: string | null
  family: ResidentFamilyMember[]
  vehicles: ResidentVehicle[]
  emergencyContact: { name: string; relation: string; phone: string }
  emergencyContact2: { name: string; relation: string; phone: string }
  preferences: { dietary: string[]; notifications: boolean; newsletter: boolean }
  // 'none': no login yet. 'pending': login exists, still on the temp password.
  // 'active': resident has set their own password.
  loginStatus: 'none' | 'pending' | 'active'
}

// Every field a member may persist. The server enforces this allowlist too.
// All optional — each tab sends only the fields it owns, so tabs never overwrite each other.
export interface ResidentProfileUpdate {
  name: string
  phone: string
  avatarSeed: string
  avatarStyle: string | null
  emergencyName: string
  emergencyRelation: string
  emergencyPhone: string
  emergency2Name: string
  emergency2Relation: string
  emergency2Phone: string
  notifications: boolean
  newsletter: boolean
  dietary: string[]
}

// Note: GET /residents (getAllResidents, below) returns a narrower server-side
// projection than GET /residents/me or /residents/:id — family, vehicles, dietary,
// notifications, newsletter, emergency contacts, avatarSeed/Style, and
// noticesLastSeenAt come back undefined on list rows, not the empty/default values
// this type implies. Fine today since no list consumer reads those fields; a future
// one that does needs the real detail fetch, not this list.
const toProfile = (r: ResidentApiResponse): ResidentProfile => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  unit: r.unit,
  tier: r.tier,
  avatarSeed: r.avatarSeed,
  avatarStyle: r.avatarStyle,
  moveInDate: r.moveInDate,
  noticesLastSeenAt: r.noticesLastSeenAt,
  family: r.family,
  vehicles: r.vehicles,
  emergencyContact: { name: r.emergencyName, relation: r.emergencyRelation, phone: r.emergencyPhone },
  emergencyContact2: {
    name: r.emergency2Name ?? '',
    relation: r.emergency2Relation ?? '',
    phone: r.emergency2Phone ?? '',
  },
  preferences: { dietary: r.dietary, notifications: r.notifications, newsletter: r.newsletter },
  loginStatus: !r.user ? 'none' : r.user.mustChangePassword ? 'pending' : 'active',
})

const TIER_LABELS: Record<ResidentTier, string> = {
  SIGNATURE: 'Signature',
  PRESTIGE: 'Prestige',
  ELITE: 'Elite',
}

export const tierLabel = (tier: ResidentTier) => TIER_LABELS[tier] ?? tier

export interface FamilyMemberInput {
  name: string
  relation: string
  age: number
}

export interface VehicleInput {
  make: string
  model: string
  plate: string
  color: string
}

export const getMyProfile = () => api.get<ResidentApiResponse>('/residents/me').then(toProfile)

// STAFF/MANAGEMENT only (enforced server-side) — the full resident directory.
export const getAllResidents = () => api.get<ResidentApiResponse[]>('/residents').then((rows) => rows.map(toProfile))

// Partial: each caller sends only the fields it owns (tab isolation). Server whitelists.
export const updateMyProfile = (patch: Partial<ResidentProfileUpdate>) =>
  api.put<ResidentApiResponse>('/residents/me', patch).then(toProfile)

export const addFamilyMember = (data: FamilyMemberInput) =>
  api.post<ResidentApiResponse>('/residents/me/family', data).then(toProfile)

export const updateFamilyMember = (id: string, data: FamilyMemberInput) =>
  api.put<ResidentApiResponse>(`/residents/me/family/${id}`, data).then(toProfile)

export const removeFamilyMember = (id: string) =>
  api.del<ResidentApiResponse>(`/residents/me/family/${id}`).then(toProfile)

export const addVehicle = (data: VehicleInput) =>
  api.post<ResidentApiResponse>('/residents/me/vehicles', data).then(toProfile)

export const updateVehicle = (id: string, data: VehicleInput) =>
  api.put<ResidentApiResponse>(`/residents/me/vehicles/${id}`, data).then(toProfile)

export const removeVehicle = (id: string) =>
  api.del<ResidentApiResponse>(`/residents/me/vehicles/${id}`).then(toProfile)

// Marks the notices feed as read up to now (server stamps the time).
export const markNoticesSeen = () =>
  api.post<ResidentApiResponse>('/residents/me/notices-seen', {}).then(toProfile)

// --- Admin (STAFF/MANAGEMENT) resident directory ---
// The admin form only collects identity + unit assignment — phone, emergency
// contacts, and avatar are left blank for the resident to fill in themselves once
// they have a login. Logins are no longer self-registered: MANAGEMENT issues them
// directly via createResidentLogin (see resident.controller.js `createLogin`),
// separately from profile creation. STAFF can still create a profile-only row to
// reserve a unit before the resident (or their login) exists.
export interface ResidentAdminInput {
  name: string
  email: string
  unit: string
  tier: ResidentTier
}

export const createResident = (data: ResidentAdminInput) =>
  api
    .post<ResidentApiResponse>('/residents', {
      ...data,
      phone: '',
      avatarSeed: Math.random().toString(36).slice(2, 10),
      avatarStyle: null,
      moveInDate: new Date().toISOString(),
      dietary: [],
      notifications: true,
      newsletter: true,
      emergencyName: '',
      emergencyRelation: '',
      emergencyPhone: '',
    })
    .then(toProfile)

// Deliberately limited to identity/unit fields. Note: editing email here does not
// sync a linked login's sign-in email — that only happens through the resident's
// own verify-then-apply flow — so this is only safe before a login has been created
// for them, or they'll need to update their sign-in email separately afterward.
export const updateResident = (id: string, data: ResidentAdminInput) =>
  api.put<ResidentApiResponse>(`/residents/${id}`, data).then(toProfile)

export const deleteResident = (id: string) => api.del<void>(`/residents/${id}`)

// MANAGEMENT only (enforced server-side) — issues a login for an existing resident.
// tempPassword is shown exactly once in this response; it is never retrievable again.
export interface ResidentLoginResult {
  tempPassword: string
  resident: ResidentProfile
}

export const createResidentLogin = (residentId: string): Promise<ResidentLoginResult> =>
  api
    .post<{ resident: ResidentApiResponse; tempPassword: string; email: string }>(`/residents/${residentId}/create-login`, {})
    .then((r) => ({ tempPassword: r.tempPassword, resident: toProfile(r.resident) }))
