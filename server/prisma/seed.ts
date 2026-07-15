import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const residents = [
  { id: 'res-001', name: 'Isabelle Rhodes', email: 'isabelle.rhodes@stayflow.io', phone: '+1 (415) 555-0142', unit: 'Skyline Tower · 24B', tier: 'ELITE', moveInDate: '2021-03-12', family: [{ name: 'Marcus Rhodes', relation: 'Spouse', age: 41 }, { name: 'Nora Rhodes', relation: 'Daughter', age: 9 }], vehicles: [{ make: 'Porsche', model: 'Taycan', plate: 'SFW-2481', color: 'Midnight Blue' }], emergencyName: 'Marcus Rhodes', emergencyRelation: 'Spouse', emergencyPhone: '+1 (415) 555-0198', dietary: ['Pescatarian'] },
  { id: 'res-002', name: 'Daniel Okafor', email: 'daniel.okafor@stayflow.io', phone: '+1 (415) 555-0187', unit: 'Garden Residences · 08A', tier: 'PRESTIGE', moveInDate: '2022-07-01', family: [{ name: 'Amara Okafor', relation: 'Spouse', age: 38 }], vehicles: [{ make: 'Range Rover', model: 'Velar', plate: 'SFW-1190', color: 'Santorini Black' }], emergencyName: 'Amara Okafor', emergencyRelation: 'Spouse', emergencyPhone: '+1 (415) 555-0111', dietary: [] },
  { id: 'res-003', name: 'Priya Nathan', email: 'priya.nathan@stayflow.io', phone: '+1 (415) 555-0163', unit: 'Skyline Tower · 31C', tier: 'SIGNATURE', moveInDate: '2023-01-20', family: [], vehicles: [], emergencyName: 'Ravi Nathan', emergencyRelation: 'Brother', emergencyPhone: '+1 (415) 555-0122', dietary: ['Vegetarian', 'Gluten-Free'] },
  { id: 'res-004', name: 'Julian Castellanos', email: 'julian.castellanos@stayflow.io', phone: '+1 (415) 555-0121', unit: 'The Pavilion · 12D', tier: 'ELITE', moveInDate: '2020-11-05', family: [{ name: 'Elena Castellanos', relation: 'Spouse', age: 44 }, { name: 'Mateo Castellanos', relation: 'Son', age: 14 }, { name: 'Sofia Castellanos', relation: 'Daughter', age: 11 }], vehicles: [{ make: 'Mercedes-Benz', model: 'S-Class', plate: 'SFW-0087', color: 'Obsidian Black' }, { make: 'Tesla', model: 'Model X', plate: 'SFW-3325', color: 'Pearl White' }], emergencyName: 'Elena Castellanos', emergencyRelation: 'Spouse', emergencyPhone: '+1 (415) 555-0177', dietary: [] },
  { id: 'res-005', name: 'Wei Zhang', email: 'wei.zhang@stayflow.io', phone: '+1 (415) 555-0154', unit: 'Garden Residences · 15B', tier: 'PRESTIGE', moveInDate: '2022-04-18', family: [{ name: 'Lin Zhang', relation: 'Spouse', age: 35 }], vehicles: [{ make: 'BMW', model: 'iX', plate: 'SFW-7742', color: 'Storm Bay' }], emergencyName: 'Lin Zhang', emergencyRelation: 'Spouse', emergencyPhone: '+1 (415) 555-0166', dietary: ['Halal'] },
  { id: 'res-006', name: 'Amelia Foster', email: 'amelia.foster@stayflow.io', phone: '+1 (415) 555-0139', unit: 'Skyline Tower · 09A', tier: 'SIGNATURE', moveInDate: '2023-09-02', family: [], vehicles: [{ make: 'Audi', model: 'e-tron GT', plate: 'SFW-5561', color: 'Kemora Grey' }], emergencyName: 'Grace Foster', emergencyRelation: 'Mother', emergencyPhone: '+1 (415) 555-0133', dietary: ['Vegan'] },
  { id: 'res-007', name: 'Theodore Kim', email: 'theodore.kim@stayflow.io', phone: '+1 (415) 555-0175', unit: 'The Pavilion · 04B', tier: 'ELITE', moveInDate: '2019-06-14', family: [{ name: 'Hana Kim', relation: 'Spouse', age: 47 }], vehicles: [{ make: 'Bentley', model: 'Bentayga', plate: 'SFW-0019', color: 'Anthracite' }], emergencyName: 'Hana Kim', emergencyRelation: 'Spouse', emergencyPhone: '+1 (415) 555-0188', dietary: [] },
  { id: 'res-008', name: 'Sofia Marchetti', email: 'sofia.marchetti@stayflow.io', phone: '+1 (415) 555-0148', unit: 'Garden Residences · 22C', tier: 'PRESTIGE', moveInDate: '2021-12-09', family: [{ name: 'Luca Marchetti', relation: 'Son', age: 6 }], vehicles: [], emergencyName: 'Marco Marchetti', emergencyRelation: 'Father', emergencyPhone: '+1 (415) 555-0155', dietary: ['Nut Allergy'] },
  { id: 'res-009', name: 'Elijah Brant', email: 'elijah.brant@stayflow.io', phone: '+1 (415) 555-0192', unit: 'Skyline Tower · 44A', tier: 'SIGNATURE', moveInDate: '2024-02-11', family: [], vehicles: [{ make: 'Lexus', model: 'RZ', plate: 'SFW-8814', color: 'Nori Green' }], emergencyName: 'Olivia Brant', emergencyRelation: 'Sister', emergencyPhone: '+1 (415) 555-0129', dietary: [] },
  { id: 'res-010', name: 'Camille Dubois', email: 'camille.dubois@stayflow.io', phone: '+1 (415) 555-0184', unit: 'The Pavilion · 18D', tier: 'ELITE', moveInDate: '2020-08-27', family: [{ name: 'Henri Dubois', relation: 'Spouse', age: 52 }], vehicles: [{ make: 'Maserati', model: 'Grecale', plate: 'SFW-2290', color: 'Blu Nettuno' }], emergencyName: 'Henri Dubois', emergencyRelation: 'Spouse', emergencyPhone: '+1 (415) 555-0141', dietary: ['Pescatarian'] },
  { id: 'res-011', name: 'Noah Whitfield', email: 'noah.whitfield@stayflow.io', phone: '+1 (415) 555-0117', unit: 'Garden Residences · 03A', tier: 'SIGNATURE', moveInDate: '2023-05-30', family: [], vehicles: [], emergencyName: 'Diane Whitfield', emergencyRelation: 'Mother', emergencyPhone: '+1 (415) 555-0108', dietary: [] },
  { id: 'res-012', name: 'Aria Solberg', email: 'aria.solberg@stayflow.io', phone: '+1 (415) 555-0173', unit: 'Skyline Tower · 27B', tier: 'PRESTIGE', moveInDate: '2022-10-15', family: [{ name: 'Erik Solberg', relation: 'Spouse', age: 39 }], vehicles: [{ make: 'Volvo', model: 'EX90', plate: 'SFW-6603', color: 'Crystal White' }], emergencyName: 'Erik Solberg', emergencyRelation: 'Spouse', emergencyPhone: '+1 (415) 555-0162', dietary: ['Dairy-Free'] },
] as const

const staff = [
  { id: 'stf-001', name: 'Marcus Webb', role: 'Concierge', email: 'marcus.webb@stayflow.io', shift: 'Morning' },
  { id: 'stf-002', name: 'Renata Silva', role: 'Facilities Manager', email: 'renata.silva@stayflow.io', shift: 'Morning' },
  { id: 'stf-003', name: 'Jonah Pierce', role: 'Guest Relations', email: 'jonah.pierce@stayflow.io', shift: 'Afternoon' },
  { id: 'stf-004', name: 'Yuki Tanaka', role: 'Dining Manager', email: 'yuki.tanaka@stayflow.io', shift: 'Afternoon' },
  { id: 'stf-005', name: 'Deshawn Ellis', role: 'Security', email: 'deshawn.ellis@stayflow.io', shift: 'Night' },
  { id: 'stf-006', name: 'Fatima Haidari', role: 'Operations', email: 'fatima.haidari@stayflow.io', shift: 'Morning' },
  { id: 'stf-007', name: 'Callum Reyes', role: 'Guest Relations', email: 'callum.reyes@stayflow.io', shift: 'Night' },
  { id: 'stf-008', name: 'Nadia Osei', role: 'Concierge', email: 'nadia.osei@stayflow.io', shift: 'Afternoon' },
] as const

const facilities = [
  { id: 'fac-001', name: 'Infinity Sky Pool', category: 'Wellness', description: 'A heated infinity-edge pool on the 40th floor with panoramic skyline views, cabanas, and poolside service.', rules: ['Children under 12 must be supervised', 'No glass containers poolside', 'Swim attire required', 'Maximum 90-minute sessions during peak hours'], image: '/images/facilities/pool.svg', capacity: 24, openHours: '6:00 AM – 10:00 PM', status: 'OPEN', rating: 4.9, location: 'Skyline Tower · Level 40' },
  { id: 'fac-002', name: 'Apex Fitness Studio', category: 'Sports', description: 'Full-service fitness studio with Technogym equipment, free weights, and dedicated stretch zone.', rules: ['Wipe down equipment after use', 'Athletic footwear required', 'Personal trainers by appointment only'], image: '/images/facilities/gym.svg', capacity: 30, openHours: '24 hours', status: 'OPEN', rating: 4.8, location: 'Skyline Tower · Level 3' },
  { id: 'fac-003', name: 'Aurora Screening Room', category: 'Entertainment', description: 'Private 20-seat cinema with 4K laser projection, Dolby Atmos sound, and reclining leather seats.', rules: ['Book minimum 24 hours in advance', 'No outside food without approval', 'Maximum party size 20'], image: '/images/facilities/cinema.svg', capacity: 20, openHours: '10:00 AM – 12:00 AM', status: 'OPEN', rating: 4.7, location: 'The Pavilion · Level 2' },
  { id: 'fac-004', name: 'Championship Tennis Court', category: 'Sports', description: 'Regulation hard court with night lighting, ball machine rental, and pro coaching available.', rules: ['Proper tennis shoes required', 'Court time limited to 60 minutes when others are waiting'], image: '/images/facilities/tennis.svg', capacity: 4, openHours: '6:00 AM – 10:00 PM', status: 'MAINTENANCE', statusReason: 'Resurfacing court lines, back Monday', rating: 4.6, location: 'Garden Residences · Courtyard' },
  { id: 'fac-005', name: 'Serenity Yoga Deck', category: 'Wellness', description: 'Open-air rooftop deck for yoga, meditation, and sound bath sessions with skyline backdrop.', rules: ['Mats provided, please sanitize after use', 'Quiet hours strictly enforced'], image: '/images/facilities/yoga.svg', capacity: 16, openHours: '6:00 AM – 8:00 PM', status: 'OPEN', rating: 4.9, location: 'Skyline Tower · Rooftop' },
  { id: 'fac-006', name: 'The Grand Function Room', category: 'Function', description: 'Elegant event space for private celebrations, corporate gatherings, and community events.', rules: ['Catering must be pre-approved', 'Deposit required for bookings over 50 guests', 'No confetti or open flame'], image: '/images/facilities/function-room.svg', capacity: 120, openHours: '9:00 AM – 11:00 PM', status: 'OPEN', rating: 4.8, location: 'The Pavilion · Ground Floor' },
  { id: 'fac-007', name: 'Serenity Spa & Sauna', category: 'Wellness', description: 'Full spa suite with sauna, steam room, cold plunge, and treatment rooms for massage therapy.', rules: ['Minimum age 16', 'Towels provided', 'Treatments by appointment only'], image: '/images/facilities/spa.svg', capacity: 12, openHours: '7:00 AM – 9:00 PM', status: 'OPEN', rating: 4.9, location: 'Garden Residences · Level 1' },
  { id: 'fac-008', name: 'Junior Play Lounge', category: 'Recreation', description: 'Supervised indoor play area with climbing structures, arts corner, and reading nook for kids.', rules: ['Ages 3–12 only', 'Parent sign-in required', 'Socks required on play structures'], image: '/images/facilities/kids-lounge.svg', capacity: 18, openHours: '9:00 AM – 7:00 PM', status: 'CLOSED', statusReason: 'Deep cleaning in progress, reopens tomorrow', rating: 4.7, location: 'The Pavilion · Level 1' },
] as const

const restaurants = [
  { id: 'rst-001', name: 'Ember & Oak', cuisine: 'Modern American Steakhouse', description: 'Dry-aged steaks and open-fire cooking in a warm, wood-lined dining room with skyline views.', image: '/images/restaurants/ember-oak.svg', openHours: '5:00 PM – 11:00 PM', priceRange: '$$$$', rating: 4.8, location: 'Skyline Tower · Level 41' },
  { id: 'rst-002', name: 'Aria Trattoria', cuisine: 'Northern Italian', description: 'Handmade pasta, wood-fired pizza, and an extensive Italian wine list in an intimate courtyard setting.', image: '/images/restaurants/aria-trattoria.svg', openHours: '11:30 AM – 10:00 PM', priceRange: '$$$', rating: 4.7, location: 'Garden Residences · Courtyard' },
  { id: 'rst-003', name: 'Koi & Copper', cuisine: 'Contemporary Japanese', description: 'Omakase counter and robata grill helmed by a rotating guest chef series, sake pairing available.', image: '/images/restaurants/koi-copper.svg', openHours: '5:30 PM – 11:30 PM', priceRange: '$$$$', rating: 4.9, location: 'The Pavilion · Level 2' },
  { id: 'rst-004', name: 'The Morning Room', cuisine: 'All-Day Café & Brunch', description: 'Light-filled café serving elevated breakfast, brunch, and coffee service throughout the day.', image: '/images/restaurants/morning-room.svg', openHours: '6:30 AM – 4:00 PM', priceRange: '$$', rating: 4.6, location: 'Skyline Tower · Ground Floor' },
] as const

const tables = [
  { restaurantId: 'rst-001', label: 'T1', seats: 2, status: 'AVAILABLE' },
  { restaurantId: 'rst-001', label: 'T2', seats: 4, status: 'RESERVED' },
  { restaurantId: 'rst-001', label: 'T3', seats: 4, status: 'AVAILABLE' },
  { restaurantId: 'rst-001', label: 'T4', seats: 6, status: 'OCCUPIED' },
  { restaurantId: 'rst-001', label: 'T5', seats: 8, status: 'AVAILABLE' },
  { restaurantId: 'rst-002', label: 'A1', seats: 2, status: 'AVAILABLE' },
  { restaurantId: 'rst-002', label: 'A2', seats: 4, status: 'AVAILABLE' },
  { restaurantId: 'rst-002', label: 'A3', seats: 4, status: 'RESERVED' },
  { restaurantId: 'rst-002', label: 'A4', seats: 6, status: 'OCCUPIED' },
  { restaurantId: 'rst-003', label: 'K1', seats: 2, status: 'RESERVED' },
  { restaurantId: 'rst-003', label: 'K2', seats: 2, status: 'AVAILABLE' },
  { restaurantId: 'rst-003', label: 'K3', seats: 4, status: 'AVAILABLE' },
  { restaurantId: 'rst-003', label: 'Private Room', seats: 10, status: 'AVAILABLE' },
  { restaurantId: 'rst-004', label: 'M1', seats: 2, status: 'AVAILABLE' },
  { restaurantId: 'rst-004', label: 'M2', seats: 4, status: 'OCCUPIED' },
  { restaurantId: 'rst-004', label: 'M3', seats: 4, status: 'AVAILABLE' },
] as const

const bookings = [
  { facilityId: 'fac-001', residentId: 'res-001', date: '2026-07-16', timeSlot: '9:00 AM – 10:30 AM', partySize: 3, status: 'CONFIRMED' },
  { facilityId: 'fac-002', residentId: 'res-002', date: '2026-07-15', timeSlot: '6:00 AM – 7:00 AM', partySize: 1, status: 'CONFIRMED' },
  { facilityId: 'fac-003', residentId: 'res-004', date: '2026-07-18', timeSlot: '7:00 PM – 9:00 PM', partySize: 8, status: 'PENDING', notes: 'Birthday celebration, need cake table' },
  { facilityId: 'fac-005', residentId: 'res-003', date: '2026-07-16', timeSlot: '7:00 AM – 8:00 AM', partySize: 1, status: 'CONFIRMED' },
  { facilityId: 'fac-006', residentId: 'res-010', date: '2026-07-25', timeSlot: '6:00 PM – 11:00 PM', partySize: 60, status: 'PENDING', notes: 'Anniversary party, catering approval needed' },
  { facilityId: 'fac-001', residentId: 'res-007', date: '2026-07-14', timeSlot: '4:00 PM – 5:30 PM', partySize: 2, status: 'CANCELLED' },
  { facilityId: 'fac-007', residentId: 'res-008', date: '2026-07-17', timeSlot: '2:00 PM – 3:00 PM', partySize: 1, status: 'CONFIRMED' },
  { facilityId: 'fac-002', residentId: 'res-005', date: '2026-07-15', timeSlot: '5:30 PM – 6:30 PM', partySize: 2, status: 'CONFIRMED' },
  { facilityId: 'fac-004', residentId: 'res-011', date: '2026-07-20', timeSlot: '8:00 AM – 9:00 AM', partySize: 2, status: 'PENDING' },
  { facilityId: 'fac-003', residentId: 'res-012', date: '2026-07-19', timeSlot: '3:00 PM – 5:00 PM', partySize: 6, status: 'CONFIRMED' },
  { facilityId: 'fac-001', residentId: 'res-006', date: '2026-07-17', timeSlot: '11:00 AM – 12:30 PM', partySize: 1, status: 'CONFIRMED' },
  { facilityId: 'fac-005', residentId: 'res-009', date: '2026-07-16', timeSlot: '6:00 PM – 7:00 PM', partySize: 4, status: 'PENDING' },
] as const

const diningReservations = [
  { restaurantId: 'rst-001', residentId: 'res-001', date: '2026-07-15', time: '7:30 PM', partySize: 2, occasion: 'Anniversary', dietary: 'Pescatarian', seating: 'Indoor', status: 'CONFIRMED' },
  { restaurantId: 'rst-002', residentId: 'res-004', date: '2026-07-15', time: '6:00 PM', partySize: 5, seating: 'Outdoor', status: 'CONFIRMED' },
  { restaurantId: 'rst-003', residentId: 'res-007', date: '2026-07-16', time: '8:00 PM', partySize: 2, occasion: 'Business dinner', seating: 'Bar', status: 'PENDING' },
  { restaurantId: 'rst-004', residentId: 'res-003', date: '2026-07-15', time: '9:00 AM', partySize: 3, dietary: 'Vegetarian, Gluten-Free', seating: 'Indoor', status: 'ARRIVED' },
  { restaurantId: 'rst-001', residentId: 'res-010', date: '2026-07-18', time: '8:00 PM', partySize: 4, seating: 'Private Room', status: 'CONFIRMED' },
  { restaurantId: 'rst-002', residentId: 'res-008', date: '2026-07-14', time: '12:30 PM', partySize: 2, dietary: 'Nut Allergy', seating: 'Indoor', status: 'CANCELLED' },
  { restaurantId: 'rst-003', residentId: 'res-012', date: '2026-07-17', time: '7:00 PM', partySize: 6, occasion: 'Birthday', seating: 'Private Room', status: 'PENDING' },
  { restaurantId: 'rst-004', residentId: 'res-006', date: '2026-07-15', time: '10:30 AM', partySize: 1, dietary: 'Vegan', seating: 'Indoor', status: 'CONFIRMED' },
] as const

const guests = [
  { name: 'Harrison Blake', hostResidentId: 'res-001', purpose: 'Personal visit', vehiclePlate: 'CA-8821X', arrivalDate: '2026-07-15', arrivalTime: '2:00 PM', passNumber: 'SF-GP-48213', status: 'CHECKED_IN', checkedInAt: '2026-07-15T14:05:00Z' },
  { name: 'Sophie Laurent', hostResidentId: 'res-004', purpose: 'Delivery coordination', arrivalDate: '2026-07-15', arrivalTime: '3:30 PM', passNumber: 'SF-GP-48214', status: 'APPROVED' },
  { name: 'Marcus Feld', hostResidentId: 'res-007', purpose: 'Contractor', vehiclePlate: 'CA-2290Z', arrivalDate: '2026-07-15', arrivalTime: '9:00 AM', passNumber: 'SF-GP-48198', status: 'CHECKED_OUT', checkedInAt: '2026-07-15T09:10:00Z', checkedOutAt: '2026-07-15T12:40:00Z' },
  { name: 'Ingrid Solveig', hostResidentId: 'res-010', purpose: 'Personal visit', arrivalDate: '2026-07-16', arrivalTime: '11:00 AM', passNumber: 'SF-GP-48227', status: 'PENDING' },
  { name: 'Tobias Renner', hostResidentId: 'res-002', purpose: 'Personal visit', vehiclePlate: 'CA-6613A', arrivalDate: '2026-07-15', arrivalTime: '5:00 PM', passNumber: 'SF-GP-48219', status: 'APPROVED' },
  { name: 'Layla Haddad', hostResidentId: 'res-003', purpose: 'Family visit', arrivalDate: '2026-07-15', arrivalTime: '1:00 PM', passNumber: 'SF-GP-48210', status: 'CHECKED_IN', checkedInAt: '2026-07-15T13:05:00Z' },
  { name: 'Owen Petrova', hostResidentId: 'res-012', purpose: 'Personal trainer', arrivalDate: '2026-07-16', arrivalTime: '7:00 AM', passNumber: 'SF-GP-48231', status: 'PENDING' },
  { name: 'Ava Sinclair', hostResidentId: 'res-008', purpose: 'Family visit', vehiclePlate: 'CA-9042B', arrivalDate: '2026-07-14', arrivalTime: '4:00 PM', passNumber: 'SF-GP-48176', status: 'CHECKED_OUT', checkedInAt: '2026-07-14T16:05:00Z', checkedOutAt: '2026-07-14T20:30:00Z' },
  { name: 'Rafael Costa', hostResidentId: 'res-005', purpose: 'Personal visit', arrivalDate: '2026-07-15', arrivalTime: '6:00 PM', passNumber: 'SF-GP-48222', status: 'APPROVED' },
  { name: 'Nina Osei', hostResidentId: 'res-011', purpose: 'Interior designer', vehiclePlate: 'CA-3387Y', arrivalDate: '2026-07-16', arrivalTime: '10:00 AM', passNumber: 'SF-GP-48229', status: 'PENDING' },
] as const

const events = [
  { id: 'evt-001', title: 'Sunset Rooftop Wine Tasting', category: 'Social', description: 'Join sommelier-led tasting of six boutique vineyards as the sun sets over the skyline.', image: '/images/events/wine-tasting.svg', date: '2026-07-18', time: '6:30 PM', location: 'Skyline Tower · Rooftop', capacity: 40, attendees: ['res-001', 'res-004', 'res-007', 'res-010'] },
  { id: 'evt-002', title: 'Morning Flow Yoga & Brunch', category: 'Wellness', description: 'Start the weekend with a guided vinyasa session followed by a plant-forward brunch spread.', image: '/images/events/yoga-brunch.svg', date: '2026-07-19', time: '8:00 AM', location: 'Serenity Yoga Deck', capacity: 20, attendees: ['res-003', 'res-006', 'res-012'] },
  { id: 'evt-003', title: 'Junior Explorers Craft Day', category: 'Kids', description: "A hands-on afternoon of art, storytelling, and games for residents' kids ages 4–12.", image: '/images/events/kids-craft.svg', date: '2026-07-20', time: '2:00 PM', location: 'Junior Play Lounge', capacity: 18, attendees: ['res-004', 'res-008'] },
  { id: 'evt-004', title: 'Summer Night Cinema: Classics Edition', category: 'Seasonal', description: 'A curated double feature of golden-age classics with artisan popcorn and craft sodas.', image: '/images/events/cinema-night.svg', date: '2026-07-24', time: '7:30 PM', location: 'Aurora Screening Room', capacity: 20, attendees: ['res-002', 'res-009', 'res-011'] },
  { id: 'evt-005', title: "Chef's Table: Taste of the Mediterranean", category: 'Cultural', description: "An intimate multi-course dinner exploring coastal Mediterranean flavors, hosted by Koi & Copper's chef.", image: '/images/events/chefs-table.svg', date: '2026-07-26', time: '7:00 PM', location: 'Koi & Copper · Private Room', capacity: 12, attendees: ['res-001', 'res-010', 'res-007'] },
  { id: 'evt-006', title: 'Community Fitness Challenge Kickoff', category: 'Wellness', description: 'Six-week fitness challenge kickoff with trainer demos, body composition scans, and prizes.', image: '/images/events/fitness-challenge.svg', date: '2026-07-22', time: '6:00 PM', location: 'Apex Fitness Studio', capacity: 30, attendees: ['res-002', 'res-005', 'res-011', 'res-012'] },
] as const

const notices = [
  { title: 'Elevator Maintenance — Skyline Tower Bank B', category: 'Maintenance', body: 'Bank B elevators will undergo scheduled maintenance on July 17 from 10:00 PM to 2:00 AM. Please use Bank A during this window.', postedBy: 'Renata Silva', pinned: true },
  { title: 'Water Shutoff Notice — Garden Residences', category: 'Important', body: 'A brief water shutoff is scheduled for July 16, 1:00–3:00 PM, for valve replacement work. We recommend storing water in advance.', postedBy: 'Fatima Haidari', pinned: true },
  { title: 'Sunset Rooftop Wine Tasting — RSVP Open', category: 'Events', body: 'Spots are filling fast for our July 18 rooftop wine tasting. Reserve your place from the Events tab before Friday.', postedBy: 'Jonah Pierce', pinned: false },
  { title: 'New Package Room Hours', category: 'General', body: 'The package room is now open until 10:00 PM daily to accommodate evening deliveries.', postedBy: 'Marcus Webb', pinned: false },
  { title: 'Tennis Court Resurfacing In Progress', category: 'Maintenance', body: 'The Championship Tennis Court is closed for resurfacing through July 20. We appreciate your patience.', postedBy: 'Renata Silva', pinned: false },
  { title: 'Summer Night Cinema Lineup Announced', category: 'Events', body: "This season's classics lineup is now live. Check the Events tab for showtimes and to reserve your seat.", postedBy: 'Jonah Pierce', pinned: false },
  { title: 'Annual Fire Safety Inspection — July 23', category: 'Important', body: 'Fire safety inspectors will access common areas and mechanical rooms on July 23 between 9:00 AM and 5:00 PM. No action required from residents.', postedBy: 'Deshawn Ellis', pinned: false },
  { title: 'Junior Play Lounge Deep Clean', category: 'Maintenance', body: 'The Junior Play Lounge is closed today for a deep clean and reopens tomorrow at 9:00 AM.', postedBy: 'Fatima Haidari', pinned: false },
] as const

const notifications = [
  { kind: 'booking', title: 'Booking confirmed', body: 'Your Infinity Sky Pool session for July 16, 9:00 AM is confirmed.', read: false },
  { kind: 'guest', title: 'Guest checked in', body: 'Harrison Blake has checked in at the main lobby.', read: false },
  { kind: 'dining', title: 'Reservation reminder', body: 'Your table at Ember & Oak is booked for 7:30 PM tonight.', read: false },
  { kind: 'event', title: 'Event RSVP confirmed', body: "You're on the list for Sunset Rooftop Wine Tasting, July 18.", read: true },
  { kind: 'notice', title: 'New community notice', body: 'Water shutoff scheduled for Garden Residences on July 16.', read: true },
  { kind: 'booking', title: 'Booking pending approval', body: 'Your Aurora Screening Room request for July 18 is awaiting staff approval.', read: true },
  { kind: 'system', title: 'Profile updated', body: 'Your emergency contact information was updated successfully.', read: true },
  { kind: 'guest', title: 'Guest pass expiring', body: "Ingrid Solveig's guest pass for July 16 is still pending approval.", read: false },
] as const

async function main() {
  console.log('Seeding residents…')
  for (const r of residents) {
    await prisma.resident.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        unit: r.unit,
        tier: r.tier as 'SIGNATURE' | 'PRESTIGE' | 'ELITE',
        avatarSeed: r.name,
        moveInDate: new Date(r.moveInDate),
        dietary: [...r.dietary],
        emergencyName: r.emergencyName,
        emergencyRelation: r.emergencyRelation,
        emergencyPhone: r.emergencyPhone,
        family: { create: r.family.map((f) => ({ ...f })) },
        vehicles: { create: r.vehicles.map((v) => ({ ...v })) },
      },
    })
  }

  console.log('Seeding staff…')
  for (const s of staff) {
    await prisma.staffMember.upsert({ where: { id: s.id }, update: {}, create: { ...s, avatarSeed: s.name } })
  }

  console.log('Seeding facilities…')
  for (const f of facilities) {
    await prisma.facility.upsert({
      where: { id: f.id },
      update: {},
      create: { ...f, rules: [...f.rules], status: f.status as 'OPEN' | 'MAINTENANCE' | 'CLOSED' },
    })
  }

  console.log('Seeding restaurants…')
  for (const r of restaurants) {
    await prisma.restaurant.upsert({ where: { id: r.id }, update: {}, create: { ...r } })
  }

  console.log('Seeding tables…')
  for (const t of tables) {
    await prisma.diningTable.create({ data: { ...t, status: t.status as 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' } })
  }

  console.log('Seeding bookings…')
  for (const b of bookings) {
    await prisma.booking.create({
      data: { ...b, date: new Date(b.date), status: b.status as 'CONFIRMED' | 'PENDING' | 'CANCELLED' },
    })
  }

  console.log('Seeding dining reservations…')
  for (const d of diningReservations) {
    await prisma.diningReservation.create({
      data: { ...d, date: new Date(d.date), status: d.status as 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'ARRIVED' },
    })
  }

  console.log('Seeding guests…')
  for (const g of guests) {
    await prisma.guest.create({
      data: {
        ...g,
        arrivalDate: new Date(g.arrivalDate),
        status: g.status as 'PENDING' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT',
        checkedInAt: 'checkedInAt' in g && g.checkedInAt ? new Date(g.checkedInAt) : undefined,
        checkedOutAt: 'checkedOutAt' in g && g.checkedOutAt ? new Date(g.checkedOutAt) : undefined,
      },
    })
  }

  console.log('Seeding events…')
  for (const e of events) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: {},
      create: {
        id: e.id,
        title: e.title,
        category: e.category,
        description: e.description,
        image: e.image,
        date: new Date(e.date),
        time: e.time,
        location: e.location,
        capacity: e.capacity,
        rsvps: { create: e.attendees.map((residentId) => ({ residentId })) },
      },
    })
  }

  console.log('Seeding notices…')
  for (const n of notices) {
    await prisma.notice.create({ data: n })
  }

  console.log('Seeding notifications…')
  for (const n of notifications) {
    await prisma.notification.create({ data: n })
  }

  console.log('Seeding demo login accounts…')
  const passwordHash = await bcrypt.hash('password123', 10)

  await prisma.user.upsert({
    where: { email: 'member@stayflow.io' },
    update: {},
    create: { email: 'member@stayflow.io', passwordHash, role: 'MEMBER', displayName: 'Isabelle Rhodes', residentId: 'res-001' },
  })
  await prisma.user.upsert({
    where: { email: 'staff@stayflow.io' },
    update: {},
    create: { email: 'staff@stayflow.io', passwordHash, role: 'STAFF', displayName: 'Marcus Webb', staffId: 'stf-001' },
  })
  await prisma.user.upsert({
    where: { email: 'admin@stayflow.io' },
    update: {},
    create: { email: 'admin@stayflow.io', passwordHash, role: 'MANAGEMENT', displayName: 'Priya Anand' },
  })

  console.log('Seed complete.')
  console.log('Demo logins (password: password123): member@stayflow.io / staff@stayflow.io / admin@stayflow.io')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
