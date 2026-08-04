import type { ResidentTier } from '#/lib/api/resident'
import type { StaffShift } from '#/lib/api/staff'

export interface ResidentDraft {
  id?: string
  name: string
  email: string
  unit: string
  tier: ResidentTier
}

export interface StaffDraft {
  id?: string
  name: string
  role: string
  email: string
  shift: StaffShift
}

export const tiers: ResidentTier[] = ['SIGNATURE', 'PRESTIGE', 'ELITE']
export const roles = [
  'Concierge',
  'Facilities Manager',
  'Guest Relations',
  'Dining Manager',
  'Security',
  'Operations',
]
export const shifts: StaffShift[] = ['Morning', 'Afternoon', 'Night']

export function newResidentDraft(): ResidentDraft {
  return { name: '', email: '', unit: '', tier: 'SIGNATURE' }
}

export function newStaffDraft(): StaffDraft {
  return { name: '', role: 'Concierge', email: '', shift: 'Morning' }
}
