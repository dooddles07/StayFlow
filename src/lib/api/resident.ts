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
