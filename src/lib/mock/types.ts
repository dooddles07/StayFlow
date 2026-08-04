export type MembershipTier = 'Signature' | 'Prestige' | 'Elite'

export interface Resident {
  id: string
  name: string
  email: string
  phone: string
  unit: string
  tier: MembershipTier
  avatarSeed: string
  moveInDate: string
  family: FamilyMember[]
  vehicles: Vehicle[]
  emergencyContact: EmergencyContact
  preferences: {
    dietary: string[]
    notifications: boolean
    newsletter: boolean
  }
}

export interface FamilyMember {
  id: string
  name: string
  relation: string
  age: number
}

export interface Vehicle {
  id: string
  make: string
  model: string
  plate: string
  color: string
}

export interface EmergencyContact {
  name: string
  relation: string
  phone: string
}

export type StaffRole =
  | 'Concierge'
  | 'Facilities Manager'
  | 'Guest Relations'
  | 'Dining Manager'
  | 'Security'
  | 'Operations'

export interface StaffMember {
  id: string
  name: string
  role: StaffRole
  email: string
  shift: 'Morning' | 'Afternoon' | 'Night'
  avatarSeed: string
}

export type FacilityCategory =
  'Wellness' | 'Recreation' | 'Entertainment' | 'Sports' | 'Function'
export type FacilityStatus = 'open' | 'maintenance' | 'closed'

export interface Facility {
  id: string
  name: string
  category: FacilityCategory
  description: string
  rules: string[]
  image: string
  capacity: number
  openHours: string
  status: FacilityStatus
  statusReason?: string
  rating: number
  location: string
}

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled'

export interface Booking {
  id: string
  facilityId: string
  residentId: string
  date: string
  timeSlot: string
  partySize: number
  status: BookingStatus
  createdAt: string
  notes?: string
}

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  description: string
  image: string
  openHours: string
  priceRange: '$' | '$$' | '$$$' | '$$$$'
  rating: number
  location: string
  // Largest party the online booking flow accepts; bigger groups call in for private dining.
  maxPartySize: number
}

export interface DiningTable {
  id: string
  restaurantId: string
  label: string
  seats: number
  status: 'available' | 'reserved' | 'occupied'
}

export type DiningReservationStatus =
  'confirmed' | 'pending' | 'cancelled' | 'arrived'

export interface DiningReservation {
  id: string
  restaurantId: string
  residentId: string
  date: string
  time: string
  partySize: number
  occasion?: string
  dietary?: string
  seating: 'Indoor' | 'Outdoor' | 'Private Room' | 'Bar'
  status: DiningReservationStatus
  createdAt: string
}

export type GuestStatus = 'pending' | 'approved' | 'checked-in' | 'checked-out'

export interface Guest {
  id: string
  name: string
  hostResidentId: string
  purpose: string
  vehiclePlate?: string
  arrivalDate: string
  arrivalTime: string
  passNumber: string
  status: GuestStatus
  checkedInAt?: string
  checkedOutAt?: string
}

export type EventCategory =
  'Social' | 'Wellness' | 'Kids' | 'Seasonal' | 'Cultural'

export interface CommunityEvent {
  id: string
  title: string
  category: EventCategory
  description: string
  image: string
  date: string
  time: string
  location: string
  capacity: number
  attendeeIds: string[]
}

export type NoticeCategory = 'Important' | 'Maintenance' | 'Events' | 'General'

export interface Notice {
  id: string
  title: string
  category: NoticeCategory
  body: string
  postedAt: string
  postedBy: string
  pinned: boolean
}

export type NotificationKind =
  'booking' | 'guest' | 'dining' | 'event' | 'notice' | 'system'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: string
  read: boolean
}

export interface KpiSeriesPoint {
  label: string
  value: number
}
