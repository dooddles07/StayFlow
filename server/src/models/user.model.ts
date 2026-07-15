import { prisma } from '../lib/prisma.js'

const userInclude = {
  resident: { include: { family: true, vehicles: true } },
  staff: true,
} as const

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, include: userInclude })
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, include: userInclude })
}
