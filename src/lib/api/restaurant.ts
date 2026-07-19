import { api, cachedGet, invalidateCache } from './client'
import type { Restaurant } from '#/lib/mock/types'

export const getRestaurants = () => cachedGet<Restaurant[]>('/restaurants')
export const getRestaurant = (id: string) => cachedGet<Restaurant>(`/restaurants/${id}`)

export interface RestaurantInput {
  name: string
  cuisine: string
  description: string
  image: string
  openHours: string
  priceRange: Restaurant['priceRange']
  rating: number
  location: string
}

// Writes require STAFF/MANAGEMENT (enforced server-side). id is set by the server.
const bust = () => invalidateCache('/restaurants')
export const createRestaurant = (data: RestaurantInput) => api.post<Restaurant>('/restaurants', data).finally(bust)
export const updateRestaurant = (id: string, data: RestaurantInput) => api.put<Restaurant>(`/restaurants/${id}`, data).finally(bust)
export const deleteRestaurant = (id: string) => api.del<void>(`/restaurants/${id}`).finally(bust)
