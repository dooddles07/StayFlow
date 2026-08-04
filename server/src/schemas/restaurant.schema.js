import { z } from 'zod'
import { nonEmptyString, positiveInt } from './shared.js'

export const restaurantCreateSchema = z.object({
  name: nonEmptyString,
  cuisine: nonEmptyString,
  description: nonEmptyString,
  image: nonEmptyString,
  openHours: nonEmptyString,
  priceRange: nonEmptyString,
  rating: z.number(),
  location: nonEmptyString,
  maxPartySize: positiveInt,
})

export const restaurantUpdateSchema = restaurantCreateSchema.partial()
