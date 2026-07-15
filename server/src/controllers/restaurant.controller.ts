import type { Request, Response } from 'express'
import { z } from 'zod'
import * as RestaurantModel from '../models/restaurant.model.js'
import { ApiError } from '../utils/ApiError.js'

const restaurantInputSchema = z.object({
  name: z.string().min(1),
  cuisine: z.string().min(1),
  description: z.string().min(1),
  image: z.string().min(1),
  openHours: z.string().min(1),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']),
  location: z.string().min(1),
  rating: z.number().min(0).max(5).optional(),
})

export async function list(_req: Request, res: Response) {
  res.json(await RestaurantModel.listRestaurants())
}

export async function getById(req: Request, res: Response) {
  const restaurant = await RestaurantModel.getRestaurantById(req.params.id!)
  if (!restaurant) throw ApiError.notFound('Restaurant not found')
  res.json(restaurant)
}

export async function create(req: Request, res: Response) {
  const input = restaurantInputSchema.parse(req.body)
  res.status(201).json(await RestaurantModel.createRestaurant(input))
}

export async function update(req: Request, res: Response) {
  const input = restaurantInputSchema.partial().parse(req.body)
  res.json(await RestaurantModel.updateRestaurant(req.params.id!, input))
}

export async function remove(req: Request, res: Response) {
  await RestaurantModel.deleteRestaurant(req.params.id!)
  res.status(204).end()
}
