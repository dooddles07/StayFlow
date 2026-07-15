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
  moveInDate: string
  dietary: string[]
  notifications: boolean
  newsletter: boolean
  emergencyName: string
  emergencyRelation: string
  emergencyPhone: string
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
  moveInDate: string
  family: ResidentFamilyMember[]
  vehicles: ResidentVehicle[]
  emergencyContact: { name: string; relation: string; phone: string }
  preferences: { dietary: string[]; notifications: boolean; newsletter: boolean }
}

// Only the fields a member may persist. The server enforces this too.
export interface ResidentProfileUpdate {
  name: string
  phone: string
  emergencyName: string
  emergencyRelation: string
  emergencyPhone: string
  notifications: boolean
  newsletter: boolean
}

const toProfile = (r: ResidentApiResponse): ResidentProfile => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  unit: r.unit,
  tier: r.tier,
  avatarSeed: r.avatarSeed,
  moveInDate: r.moveInDate,
  family: r.family,
  vehicles: r.vehicles,
  emergencyContact: { name: r.emergencyName, relation: r.emergencyRelation, phone: r.emergencyPhone },
  preferences: { dietary: r.dietary, notifications: r.notifications, newsletter: r.newsletter },
})

const TIER_LABELS: Record<ResidentTier, string> = {
  SIGNATURE: 'Signature',
  PRESTIGE: 'Prestige',
  ELITE: 'Elite',
}

export const tierLabel = (tier: ResidentTier) => TIER_LABELS[tier] ?? tier

export const getMyProfile = () => api.get<ResidentApiResponse>('/residents/me').then(toProfile)

export const updateMyProfile = (patch: ResidentProfileUpdate) =>
  api.put<ResidentApiResponse>('/residents/me', patch).then(toProfile)
