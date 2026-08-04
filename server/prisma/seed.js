import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { BCRYPT_ROUNDS } from '../src/utils/password.js'

const prisma = new PrismaClient()

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function main() {
  const password =
    process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url')
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const resident = await prisma.resident.upsert({
    where: { email: 'isabelle.rhodes@stayflow.io' },
    update: {},
    create: {
      id: 'res-001',
      name: 'Isabelle Rhodes',
      email: 'isabelle.rhodes@stayflow.io',
      phone: '+1 (415) 555-0142',
      unit: 'Skyline Tower · 24B',
      tier: 'ELITE',
      avatarSeed: 'Isabelle Rhodes',
      moveInDate: new Date('2021-03-12'),
      dietary: ['Pescatarian'],
      emergencyName: 'Marcus Rhodes',
      emergencyRelation: 'Spouse',
      emergencyPhone: '+1 (415) 555-0198',
      family: {
        create: [{ name: 'Marcus Rhodes', relation: 'Spouse', age: 41 }],
      },
      vehicles: {
        create: [
          {
            make: 'Porsche',
            model: 'Taycan',
            plate: 'SFW-2481',
            color: 'Midnight Blue',
          },
        ],
      },
    },
  })

  const staffMember = await prisma.staffMember.upsert({
    where: { email: 'renata.silva@stayflow.io' },
    update: {},
    create: {
      id: 'stf-002',
      name: 'Renata Silva',
      role: 'Facilities Manager',
      email: 'renata.silva@stayflow.io',
      shift: 'Morning',
      avatarSeed: 'Renata Silva',
    },
  })

  await prisma.user.upsert({
    where: { email: resident.email },
    update: {},
    create: {
      email: resident.email,
      passwordHash,
      role: 'MEMBER',
      displayName: resident.name,
      residentId: resident.id,
    },
  })
  await prisma.user.upsert({
    where: { email: staffMember.email },
    update: {},
    create: {
      email: staffMember.email,
      passwordHash,
      role: 'STAFF',
      displayName: staffMember.name,
      staffId: staffMember.id,
    },
  })

  const pool = await prisma.facility.upsert({
    where: { id: 'fac-001' },
    update: {},
    create: {
      id: 'fac-001',
      name: 'Infinity Sky Pool',
      category: 'Wellness',
      description:
        'Heated infinity-edge pool on the 40th floor with panoramic skyline views.',
      rules: ['Children under 12 must be supervised', 'Swim attire required'],
      image: '/images/facilities/pool.webp',
      capacity: 24,
      openHours: '6:00 AM – 10:00 PM',
      status: 'OPEN',
      rating: 4.9,
      location: 'Skyline Tower · Level 40',
    },
  })

  const facilitySeed = [
    {
      id: 'fac-002',
      name: 'Apex Fitness Studio',
      category: 'Sports',
      description:
        'Full-service fitness studio with Technogym equipment, free weights, and dedicated stretch zone.',
      rules: [
        'Wipe down equipment after use',
        'Athletic footwear required',
        'Personal trainers by appointment only',
      ],
      image: '/images/facilities/gym.webp',
      capacity: 30,
      openHours: '24 hours',
      status: 'OPEN',
      rating: 4.8,
      location: 'Skyline Tower · Level 3',
    },
    {
      id: 'fac-003',
      name: 'Aurora Screening Room',
      category: 'Entertainment',
      description:
        'Private 20-seat cinema with 4K laser projection, Dolby Atmos sound, and reclining leather seats.',
      rules: [
        'Book minimum 24 hours in advance',
        'No outside food without approval',
        'Maximum party size 20',
      ],
      image: '/images/facilities/cinema.webp',
      capacity: 20,
      openHours: '10:00 AM – 12:00 AM',
      status: 'OPEN',
      rating: 4.7,
      location: 'The Pavilion · Level 2',
    },
    {
      id: 'fac-004',
      name: 'Championship Tennis Court',
      category: 'Sports',
      description:
        'Regulation hard court with night lighting, ball machine rental, and pro coaching available.',
      rules: [
        'Proper tennis shoes required',
        'Court time limited to 60 minutes when others are waiting',
      ],
      image: '/images/facilities/tennis.webp',
      capacity: 4,
      openHours: '6:00 AM – 10:00 PM',
      status: 'MAINTENANCE',
      statusReason: 'Resurfacing court lines, back Monday',
      rating: 4.6,
      location: 'Garden Residences · Courtyard',
    },
    {
      id: 'fac-005',
      name: 'Serenity Yoga Deck',
      category: 'Wellness',
      description:
        'Open-air rooftop deck for yoga, meditation, and sound bath sessions with skyline backdrop.',
      rules: [
        'Mats provided, please sanitize after use',
        'Quiet hours strictly enforced',
      ],
      image: '/images/facilities/yoga.webp',
      capacity: 16,
      openHours: '6:00 AM – 8:00 PM',
      status: 'OPEN',
      rating: 4.9,
      location: 'Skyline Tower · Rooftop',
    },
    {
      id: 'fac-006',
      name: 'The Grand Function Room',
      category: 'Function',
      description:
        'Elegant event space for private celebrations, corporate gatherings, and community events.',
      rules: [
        'Catering must be pre-approved',
        'Deposit required for bookings over 50 guests',
        'No confetti or open flame',
      ],
      image: '/images/facilities/function-room.webp',
      capacity: 120,
      openHours: '9:00 AM – 11:00 PM',
      status: 'OPEN',
      rating: 4.8,
      location: 'The Pavilion · Ground Floor',
    },
    {
      id: 'fac-007',
      name: 'Serenity Spa & Sauna',
      category: 'Wellness',
      description:
        'Full spa suite with sauna, steam room, cold plunge, and treatment rooms for massage therapy.',
      rules: [
        'Minimum age 16',
        'Towels provided',
        'Treatments by appointment only',
      ],
      image: '/images/facilities/spa.webp',
      capacity: 12,
      openHours: '7:00 AM – 9:00 PM',
      status: 'OPEN',
      rating: 4.9,
      location: 'Garden Residences · Level 1',
    },
    {
      id: 'fac-008',
      name: 'Junior Play Lounge',
      category: 'Recreation',
      description:
        'Supervised indoor play area with climbing structures, arts corner, and reading nook for kids.',
      rules: [
        'Ages 3–12 only',
        'Parent sign-in required',
        'Socks required on play structures',
      ],
      image: '/images/facilities/kids-lounge.webp',
      capacity: 18,
      openHours: '9:00 AM – 7:00 PM',
      status: 'CLOSED',
      statusReason: 'Deep cleaning in progress, reopens tomorrow',
      rating: 4.7,
      location: 'The Pavilion · Level 1',
    },
  ]

  for (const facility of facilitySeed) {
    await prisma.facility.upsert({
      where: { id: facility.id },
      update: {},
      create: facility,
    })
  }

  await prisma.booking.upsert({
    where: { id: 'bkg-001' },
    update: {},
    create: {
      id: 'bkg-001',
      facilityId: pool.id,
      residentId: resident.id,
      date: new Date('2026-07-16'),
      timeSlot: '9:00 AM – 10:30 AM',
      partySize: 3,
      status: 'CONFIRMED',
    },
  })

  const restaurant = await prisma.restaurant.upsert({
    where: { id: 'rst-001' },
    update: {},
    create: {
      id: 'rst-001',
      name: 'Ember & Oak',
      cuisine: 'Modern American Steakhouse',
      description: 'Dry-aged steaks and open-fire cooking with skyline views.',
      image: '/images/restaurants/ember-oak.svg',
      openHours: '5:00 PM – 11:00 PM',
      priceRange: '$$$$',
      rating: 4.8,
      location: 'Skyline Tower · Level 41',
      // Largest table seats 8 — matches the online booking cap; bigger parties call for private dining.
      maxPartySize: 8,
      tables: {
        create: [
          { id: 'tbl-001', label: 'T1', seats: 2, status: 'AVAILABLE' },
          { id: 'tbl-002', label: 'T2', seats: 4, status: 'RESERVED' },
        ],
      },
    },
  })

  await prisma.diningReservation.upsert({
    where: { id: 'dine-001' },
    update: {},
    create: {
      id: 'dine-001',
      restaurantId: restaurant.id,
      residentId: resident.id,
      date: new Date('2026-07-15'),
      time: '7:30 PM',
      partySize: 2,
      occasion: 'Anniversary',
      dietary: 'Pescatarian',
      seating: 'Indoor',
      status: 'CONFIRMED',
    },
  })

  await prisma.guest.upsert({
    where: { passNumber: 'SF-GP-48213' },
    update: {},
    create: {
      id: 'gst-001',
      name: 'Harrison Blake',
      hostResidentId: resident.id,
      purpose: 'Personal visit',
      vehiclePlate: 'CA-8821X',
      arrivalDate: new Date('2026-07-15'),
      arrivalTime: '2:00 PM',
      passNumber: 'SF-GP-48213',
      status: 'CHECKED_IN',
      checkedInAt: new Date('2026-07-15T14:05:00Z'),
    },
  })

  const event = await prisma.communityEvent.upsert({
    where: { id: 'evt-001' },
    update: {},
    create: {
      id: 'evt-001',
      title: 'Sunset Rooftop Wine Tasting',
      category: 'Social',
      description:
        'Sommelier-led tasting of six boutique vineyards as the sun sets over the skyline.',
      image: '/images/events/wine-tasting.svg',
      date: daysFromNow(14),
      time: '6:30 PM',
      location: 'Skyline Tower · Rooftop',
      capacity: 40,
    },
  })

  await prisma.eventRsvp.upsert({
    where: {
      eventId_residentId: { eventId: event.id, residentId: resident.id },
    },
    update: {},
    create: { eventId: event.id, residentId: resident.id },
  })

  const noticeSeed = [
    {
      id: 'ntc-001',
      title: 'Elevator Maintenance — Skyline Tower Bank B',
      category: 'Maintenance',
      body: 'Bank B elevators will undergo scheduled maintenance on July 17 from 10:00 PM to 2:00 AM. Please use Bank A during this window.',
      postedAt: new Date('2026-07-14T09:00:00Z'),
      postedBy: staffMember.name,
      pinned: true,
    },
    {
      id: 'ntc-002',
      title: 'Water Shutoff Notice — Garden Residences',
      category: 'Important',
      body: 'A brief water shutoff is scheduled for July 16, 1:00–3:00 PM, for valve replacement work. We recommend storing water in advance.',
      postedAt: new Date('2026-07-13T15:30:00Z'),
      postedBy: 'Fatima Haidari',
      pinned: true,
    },
    {
      id: 'ntc-003',
      title: 'Sunset Rooftop Wine Tasting — RSVP Open',
      category: 'Events',
      body: 'Spots are filling fast for our July 18 rooftop wine tasting. Reserve your place from the Events tab before Friday.',
      postedAt: new Date('2026-07-12T12:00:00Z'),
      postedBy: 'Jonah Pierce',
      pinned: false,
    },
    {
      id: 'ntc-004',
      title: 'New Package Room Hours',
      category: 'General',
      body: 'The package room is now open until 10:00 PM daily to accommodate evening deliveries.',
      postedAt: new Date('2026-07-11T08:00:00Z'),
      postedBy: 'Marcus Webb',
      pinned: false,
    },
    {
      id: 'ntc-005',
      title: 'Tennis Court Resurfacing In Progress',
      category: 'Maintenance',
      body: 'The Championship Tennis Court is closed for resurfacing through July 20. We appreciate your patience.',
      postedAt: new Date('2026-07-10T10:15:00Z'),
      postedBy: staffMember.name,
      pinned: false,
    },
    {
      id: 'ntc-006',
      title: 'Summer Night Cinema Lineup Announced',
      category: 'Events',
      body: "This season's classics lineup is now live. Check the Events tab for showtimes and to reserve your seat.",
      postedAt: new Date('2026-07-09T17:45:00Z'),
      postedBy: 'Jonah Pierce',
      pinned: false,
    },
    {
      id: 'ntc-007',
      title: 'Annual Fire Safety Inspection — July 23',
      category: 'Important',
      body: 'Fire safety inspectors will access common areas and mechanical rooms on July 23 between 9:00 AM and 5:00 PM. No action required from residents.',
      postedAt: new Date('2026-07-08T09:00:00Z'),
      postedBy: 'Deshawn Ellis',
      pinned: false,
    },
    {
      id: 'ntc-008',
      title: 'Junior Play Lounge Deep Clean',
      category: 'Maintenance',
      body: 'The Junior Play Lounge is closed today for a deep clean and reopens tomorrow at 9:00 AM.',
      postedAt: new Date('2026-07-15T07:00:00Z'),
      postedBy: 'Fatima Haidari',
      pinned: false,
    },
  ]
  for (const notice of noticeSeed) {
    await prisma.notice.upsert({
      where: { id: notice.id },
      update: {},
      create: notice,
    })
  }

  await prisma.appNotification.upsert({
    where: { id: 'notif-001' },
    update: {},
    create: {
      id: 'notif-001',
      kind: 'booking',
      title: 'Booking confirmed',
      body: 'Your Infinity Sky Pool session for July 16, 9:00 AM is confirmed.',
      read: false,
    },
  })

  console.log(
    `Seed complete. Login with isabelle.rhodes@stayflow.io / ${password} (MEMBER) or renata.silva@stayflow.io / ${password} (STAFF).`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
