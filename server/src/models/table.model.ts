import { prisma } from '../lib/prisma.js'

export function listTables(restaurantId?: string) {
  return prisma.diningTable.findMany({ where: { restaurantId }, orderBy: { label: 'asc' } })
}
