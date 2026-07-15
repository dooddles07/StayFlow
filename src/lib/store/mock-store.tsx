import * as React from 'react'
import { bookings as seedBookings } from '#/lib/mock/bookings'
import { diningReservations as seedDiningReservations } from '#/lib/mock/diningReservations'
import { guests as seedGuests } from '#/lib/mock/guests'
import { events as seedEvents } from '#/lib/mock/events'
import { notices as seedNotices } from '#/lib/mock/notices'
import { notifications as seedNotifications } from '#/lib/mock/notifications'
import { facilities as seedFacilities } from '#/lib/mock/facilities'
import { restaurants as seedRestaurants } from '#/lib/mock/restaurants'
import { residents as seedResidents } from '#/lib/mock/residents'
import { staff as seedStaff } from '#/lib/mock/staff'
import type {
  AppNotification,
  Booking,
  BookingStatus,
  CommunityEvent,
  DiningReservation,
  DiningReservationStatus,
  Facility,
  FacilityStatus,
  Guest,
  GuestStatus,
  Notice,
  Resident,
  Restaurant,
  StaffMember,
} from '#/lib/mock/types'

const STORAGE_KEY = 'stayflow.mock-store.v1'

export interface MockState {
  residents: Resident[]
  staff: StaffMember[]
  facilities: Facility[]
  restaurants: Restaurant[]
  bookings: Booking[]
  diningReservations: DiningReservation[]
  guests: Guest[]
  events: CommunityEvent[]
  notices: Notice[]
  notifications: AppNotification[]
}

function seedState(): MockState {
  return {
    residents: seedResidents,
    staff: seedStaff,
    facilities: seedFacilities,
    restaurants: seedRestaurants,
    bookings: seedBookings,
    diningReservations: seedDiningReservations,
    guests: seedGuests,
    events: seedEvents,
    notices: seedNotices,
    notifications: seedNotifications,
  }
}

export function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

type Action =
  | { type: 'ADD_BOOKING'; payload: Booking }
  | { type: 'UPDATE_BOOKING_STATUS'; payload: { id: string; status: BookingStatus } }
  | { type: 'ADD_DINING_RESERVATION'; payload: DiningReservation }
  | { type: 'UPDATE_DINING_STATUS'; payload: { id: string; status: DiningReservationStatus } }
  | { type: 'ADD_GUEST'; payload: Guest }
  | { type: 'UPDATE_GUEST_STATUS'; payload: { id: string; status: GuestStatus } }
  | { type: 'TOGGLE_EVENT_RSVP'; payload: { eventId: string; residentId: string } }
  | { type: 'ADD_EVENT'; payload: CommunityEvent }
  | { type: 'UPDATE_EVENT'; payload: CommunityEvent }
  | { type: 'DELETE_EVENT'; payload: { id: string } }
  | { type: 'ADD_NOTICE'; payload: Notice }
  | { type: 'UPDATE_NOTICE'; payload: Notice }
  | { type: 'DELETE_NOTICE'; payload: { id: string } }
  | { type: 'UPDATE_FACILITY_STATUS'; payload: { id: string; status: FacilityStatus; reason?: string } }
  | { type: 'ADD_FACILITY'; payload: Facility }
  | { type: 'UPDATE_FACILITY'; payload: Facility }
  | { type: 'DELETE_FACILITY'; payload: { id: string } }
  | { type: 'ADD_RESTAURANT'; payload: Restaurant }
  | { type: 'UPDATE_RESTAURANT'; payload: Restaurant }
  | { type: 'DELETE_RESTAURANT'; payload: { id: string } }
  | { type: 'ADD_RESIDENT'; payload: Resident }
  | { type: 'UPDATE_RESIDENT'; payload: Resident }
  | { type: 'DELETE_RESIDENT'; payload: { id: string } }
  | { type: 'ADD_STAFF'; payload: StaffMember }
  | { type: 'UPDATE_STAFF'; payload: StaffMember }
  | { type: 'DELETE_STAFF'; payload: { id: string } }
  | { type: 'MARK_NOTIFICATION_READ'; payload: { id: string } }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'RESET_MOCK_DATA' }

function reducer(state: MockState, action: Action): MockState {
  switch (action.type) {
    case 'ADD_BOOKING':
      return { ...state, bookings: [action.payload, ...state.bookings] }
    case 'UPDATE_BOOKING_STATUS':
      return {
        ...state,
        bookings: state.bookings.map((b) => (b.id === action.payload.id ? { ...b, status: action.payload.status } : b)),
      }
    case 'ADD_DINING_RESERVATION':
      return { ...state, diningReservations: [action.payload, ...state.diningReservations] }
    case 'UPDATE_DINING_STATUS':
      return {
        ...state,
        diningReservations: state.diningReservations.map((d) =>
          d.id === action.payload.id ? { ...d, status: action.payload.status } : d,
        ),
      }
    case 'ADD_GUEST':
      return { ...state, guests: [action.payload, ...state.guests] }
    case 'UPDATE_GUEST_STATUS': {
      const now = new Date().toISOString()
      return {
        ...state,
        guests: state.guests.map((g) => {
          if (g.id !== action.payload.id) return g
          const patch: Partial<Guest> = { status: action.payload.status }
          if (action.payload.status === 'checked-in') patch.checkedInAt = now
          if (action.payload.status === 'checked-out') patch.checkedOutAt = now
          return { ...g, ...patch }
        }),
      }
    }
    case 'TOGGLE_EVENT_RSVP':
      return {
        ...state,
        events: state.events.map((e) => {
          if (e.id !== action.payload.eventId) return e
          const attending = e.attendeeIds.includes(action.payload.residentId)
          return {
            ...e,
            attendeeIds: attending
              ? e.attendeeIds.filter((id) => id !== action.payload.residentId)
              : [...e.attendeeIds, action.payload.residentId],
          }
        }),
      }
    case 'ADD_EVENT':
      return { ...state, events: [action.payload, ...state.events] }
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map((e) => (e.id === action.payload.id ? action.payload : e)) }
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter((e) => e.id !== action.payload.id) }
    case 'ADD_NOTICE':
      return { ...state, notices: [action.payload, ...state.notices] }
    case 'UPDATE_NOTICE':
      return { ...state, notices: state.notices.map((n) => (n.id === action.payload.id ? action.payload : n)) }
    case 'DELETE_NOTICE':
      return { ...state, notices: state.notices.filter((n) => n.id !== action.payload.id) }
    case 'UPDATE_FACILITY_STATUS':
      return {
        ...state,
        facilities: state.facilities.map((f) =>
          f.id === action.payload.id ? { ...f, status: action.payload.status, statusReason: action.payload.reason } : f,
        ),
      }
    case 'ADD_FACILITY':
      return { ...state, facilities: [action.payload, ...state.facilities] }
    case 'UPDATE_FACILITY':
      return { ...state, facilities: state.facilities.map((f) => (f.id === action.payload.id ? action.payload : f)) }
    case 'DELETE_FACILITY':
      return { ...state, facilities: state.facilities.filter((f) => f.id !== action.payload.id) }
    case 'ADD_RESTAURANT':
      return { ...state, restaurants: [action.payload, ...state.restaurants] }
    case 'UPDATE_RESTAURANT':
      return { ...state, restaurants: state.restaurants.map((r) => (r.id === action.payload.id ? action.payload : r)) }
    case 'DELETE_RESTAURANT':
      return { ...state, restaurants: state.restaurants.filter((r) => r.id !== action.payload.id) }
    case 'ADD_RESIDENT':
      return { ...state, residents: [action.payload, ...state.residents] }
    case 'UPDATE_RESIDENT':
      return { ...state, residents: state.residents.map((r) => (r.id === action.payload.id ? action.payload : r)) }
    case 'DELETE_RESIDENT':
      return { ...state, residents: state.residents.filter((r) => r.id !== action.payload.id) }
    case 'ADD_STAFF':
      return { ...state, staff: [action.payload, ...state.staff] }
    case 'UPDATE_STAFF':
      return { ...state, staff: state.staff.map((s) => (s.id === action.payload.id ? action.payload : s)) }
    case 'DELETE_STAFF':
      return { ...state, staff: state.staff.filter((s) => s.id !== action.payload.id) }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.id === action.payload.id ? { ...n, read: true } : n)),
      }
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) }
    case 'RESET_MOCK_DATA':
      return seedState()
    default:
      return state
  }
}

function loadInitialState(): MockState {
  if (typeof window === 'undefined') return seedState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState()
    const parsed = JSON.parse(raw) as Partial<MockState>
    return { ...seedState(), ...parsed }
  } catch {
    return seedState()
  }
}

interface MockStoreContextValue {
  state: MockState
  dispatch: React.Dispatch<Action>
}

const MockStoreContext = React.createContext<MockStoreContextValue | null>(null)

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, undefined, loadInitialState)

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const value = React.useMemo(() => ({ state, dispatch }), [state])

  return <MockStoreContext.Provider value={value}>{children}</MockStoreContext.Provider>
}

export function useMockStore(): MockStoreContextValue {
  const ctx = React.useContext(MockStoreContext)
  if (!ctx) throw new Error('useMockStore must be used within MockStoreProvider')
  return ctx
}
