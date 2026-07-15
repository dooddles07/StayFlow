import type { Restaurant } from './types'

export const restaurants: Restaurant[] = [
  {
    id: 'rst-001',
    name: 'Ember & Oak',
    cuisine: 'Modern American Steakhouse',
    description: 'Dry-aged steaks and open-fire cooking in a warm, wood-lined dining room with skyline views.',
    image: '/images/restaurants/ember-oak.svg',
    openHours: '5:00 PM – 11:00 PM',
    priceRange: '$$$$',
    rating: 4.8,
    location: 'Skyline Tower · Level 41',
  },
  {
    id: 'rst-002',
    name: 'Aria Trattoria',
    cuisine: 'Northern Italian',
    description: 'Handmade pasta, wood-fired pizza, and an extensive Italian wine list in an intimate courtyard setting.',
    image: '/images/restaurants/aria-trattoria.svg',
    openHours: '11:30 AM – 10:00 PM',
    priceRange: '$$$',
    rating: 4.7,
    location: 'Garden Residences · Courtyard',
  },
  {
    id: 'rst-003',
    name: 'Koi & Copper',
    cuisine: 'Contemporary Japanese',
    description: 'Omakase counter and robata grill helmed by a rotating guest chef series, sake pairing available.',
    image: '/images/restaurants/koi-copper.svg',
    openHours: '5:30 PM – 11:30 PM',
    priceRange: '$$$$',
    rating: 4.9,
    location: 'The Pavilion · Level 2',
  },
  {
    id: 'rst-004',
    name: 'The Morning Room',
    cuisine: 'All-Day Café & Brunch',
    description: 'Light-filled café serving elevated breakfast, brunch, and coffee service throughout the day.',
    image: '/images/restaurants/morning-room.svg',
    openHours: '6:30 AM – 4:00 PM',
    priceRange: '$$',
    rating: 4.6,
    location: 'Skyline Tower · Ground Floor',
  },
]

export function getRestaurantById(id: string): Restaurant | undefined {
  return restaurants.find((r) => r.id === id)
}
