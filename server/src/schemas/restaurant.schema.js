import { z } from 'zod'
import { imageUrl, nonEmptyString, positiveInt } from './shared.js'

export const restaurantCreateSchema = z.object({
  name: nonEmptyString,
  cuisine: nonEmptyString,
  description: nonEmptyString,
  image: imageUrl,
  openHours: nonEmptyString,
  priceRange: nonEmptyString,
  rating: z.number(),
  location: nonEmptyString,
  maxPartySize: positiveInt,
})

export const restaurantUpdateSchema = restaurantCreateSchema.partial()
