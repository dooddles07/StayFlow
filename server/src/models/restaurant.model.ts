import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'

export function listRestaurants() {
  return prisma.restaurant.findMany({ orderBy: { name: 'asc' } })
}

export function getRestaurantById(id: string) {
  return prisma.restaurant.findUnique({ where: { id } })
}

export interface RestaurantInput {
  name: string
  cuisine: string
  description: string
  image: string
  openHours: string
  priceRange: string
  location: string
  rating?: number
}

export function createRestaurant(input: RestaurantInput) {
  return prisma.restaurant.create({ data: { ...input, id: randomUUID(), rating: input.rating ?? 4.5 } })
}

export function updateRestaurant(id: string, input: Partial<RestaurantInput>) {
  return prisma.restaurant.update({ where: { id }, data: input })
}

export function deleteRestaurant(id: string) {
  return prisma.restaurant.delete({ where: { id } })
}
