import { api } from './client'
import type { Restaurant } from '#/lib/mock/types'

export const getRestaurants = () => api.get<Restaurant[]>('/restaurants')
export const getRestaurant = (id: string) => api.get<Restaurant>(`/restaurants/${id}`)

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
export const createRestaurant = (data: RestaurantInput) => api.post<Restaurant>('/restaurants', data)
export const updateRestaurant = (id: string, data: RestaurantInput) => api.put<Restaurant>(`/restaurants/${id}`, data)
export const deleteRestaurant = (id: string) => api.del<void>(`/restaurants/${id}`)
