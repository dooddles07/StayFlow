import { prisma } from '../config/db.js'

const includeRelations = {
  family: true,
  vehicles: true,
  // Minimal projection, no passwordHash or any other sensitive field — just enough
  // for the admin directory to show login status per resident.
  user: { select: { id: true, mustChangePassword: true } },
}

// The directory list (management/users.tsx, reports.tsx, staff/events.tsx,
// live-analytics) only ever reads these fields — never dietary, emergency
// contacts, family, vehicles, or notification prefs. findById (detail/self views)
// keeps the full includeRelations shape; this is deliberately narrower.
const listSelect = {
  id: true,
  name: true,
  email: true,
  unit: true,
  tier: true,
  phone: true,
  moveInDate: true,
  user: { select: { id: true, mustChangePassword: true } },
}

export const ResidentModel = {
  findAll: () => prisma.resident.findMany({ select: listSelect, orderBy: { name: 'asc' } }),
  findById: (id) => prisma.resident.findUnique({ where: { id }, include: includeRelations }),
  create: (data) => {
    const { family = [], vehicles = [], ...rest } = data
    return prisma.resident.create({
      data: {
        ...rest,
        family: { create: family },
        vehicles: { create: vehicles },
      },
      include: includeRelations,
    })
  },
  update: (id, data) => {
    const { family, vehicles, ...rest } = data
    return prisma.resident.update({ where: { id }, data: rest, include: includeRelations })
  },
  remove: (id) => prisma.resident.delete({ where: { id } }),

  // --- Family members (child rows owned by a resident) ---
  findFamilyMember: (id) => prisma.familyMember.findUnique({ where: { id } }),
  createFamilyMember: (residentId, data) => prisma.familyMember.create({ data: { ...data, residentId } }),
  updateFamilyMember: (id, data) => prisma.familyMember.update({ where: { id }, data }),
  removeFamilyMember: (id) => prisma.familyMember.delete({ where: { id } }),

  // --- Vehicles (child rows owned by a resident) ---
  findVehicle: (id) => prisma.vehicle.findUnique({ where: { id } }),
  createVehicle: (residentId, data) => prisma.vehicle.create({ data: { ...data, residentId } }),
  updateVehicle: (id, data) => prisma.vehicle.update({ where: { id }, data }),
  removeVehicle: (id) => prisma.vehicle.delete({ where: { id } }),
}
