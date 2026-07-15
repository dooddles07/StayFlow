import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const password = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url')
  const passwordHash = await bcrypt.hash(password, 10)

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
      family: { create: [{ name: 'Marcus Rhodes', relation: 'Spouse', age: 41 }] },
      vehicles: { create: [{ make: 'Porsche', model: 'Taycan', plate: 'SFW-2481', color: 'Midnight Blue' }] },
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
    create: { email: resident.email, passwordHash, role: 'MEMBER', displayName: resident.name, residentId: resident.id },
  })
  await prisma.user.upsert({
    where: { email: staffMember.email },
    update: {},
    create: { email: staffMember.email, passwordHash, role: 'STAFF', displayName: staffMember.name, staffId: staffMember.id },
  })

  const pool = await prisma.facility.upsert({
    where: { id: 'fac-001' },
    update: {},
    create: {
      id: 'fac-001',
      name: 'Infinity Sky Pool',
      category: 'Wellness',
      description: 'Heated infinity-edge pool on the 40th floor with panoramic skyline views.',
      rules: ['Children under 12 must be supervised', 'Swim attire required'],
      image: '/images/facilities/pool.svg',
      capacity: 24,
      openHours: '6:00 AM – 10:00 PM',
      status: 'OPEN',
      rating: 4.9,
      location: 'Skyline Tower · Level 40',
    },
  })

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
      description: 'Sommelier-led tasting of six boutique vineyards as the sun sets over the skyline.',
      image: '/images/events/wine-tasting.svg',
      date: new Date('2026-07-18'),
      time: '6:30 PM',
      location: 'Skyline Tower · Rooftop',
      capacity: 40,
    },
  })

  await prisma.eventRsvp.upsert({
    where: { eventId_residentId: { eventId: event.id, residentId: resident.id } },
    update: {},
    create: { eventId: event.id, residentId: resident.id },
  })

  await prisma.notice.upsert({
    where: { id: 'ntc-001' },
    update: {},
    create: {
      id: 'ntc-001',
      title: 'Elevator Maintenance — Skyline Tower Bank B',
      category: 'Maintenance',
      body: 'Bank B elevators will undergo scheduled maintenance on July 17 from 10:00 PM to 2:00 AM.',
      postedBy: staffMember.name,
      pinned: true,
    },
  })

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

  console.log(`Seed complete. Login with isabelle.rhodes@stayflow.io / ${password} (MEMBER) or renata.silva@stayflow.io / ${password} (STAFF).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
