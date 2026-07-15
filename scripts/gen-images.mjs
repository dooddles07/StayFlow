import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outRoot = join(__dirname, '..', 'public', 'images')

const INDIGO = '#4f46e5'
const INDIGO_SOFT = '#6366f1'
const GOLD = '#c9a84c'
const GOLD_SOFT = '#ddc178'
const CANVAS = '#0a0a1a'
const SURFACE = '#141432'

function waves(hueA, hueB) {
  return `
    <path d="M-20 300 Q 100 240 220 300 T 460 300 T 700 300 T 940 300" stroke="${hueA}" stroke-width="2" fill="none" opacity="0.35"/>
    <path d="M-20 340 Q 100 280 220 340 T 460 340 T 700 340 T 940 340" stroke="${hueB}" stroke-width="2" fill="none" opacity="0.25"/>
    <path d="M-20 380 Q 100 320 220 380 T 460 380 T 700 380 T 940 380" stroke="${hueA}" stroke-width="1.5" fill="none" opacity="0.2"/>
  `
}

function rings(cx, cy, color) {
  return Array.from({ length: 4 }, (_, i) => `<circle cx="${cx}" cy="${cy}" r="${40 + i * 38}" stroke="${color}" stroke-width="1.5" fill="none" opacity="${0.32 - i * 0.06}"/>`).join('')
}

function grid(color) {
  let lines = ''
  for (let x = 0; x <= 800; x += 40) lines += `<line x1="${x}" y1="0" x2="${x}" y2="450" stroke="${color}" stroke-width="0.5" opacity="0.08"/>`
  for (let y = 0; y <= 450; y += 40) lines += `<line x1="0" y1="${y}" x2="800" y2="${y}" stroke="${color}" stroke-width="0.5" opacity="0.08"/>`
  return lines
}

function dots(color) {
  let d = ''
  for (let x = 30; x < 800; x += 46) {
    for (let y = 30; y < 450; y += 46) {
      d += `<circle cx="${x}" cy="${y}" r="1.6" fill="${color}" opacity="0.18"/>`
    }
  }
  return d
}

function diagonalBars(color) {
  let d = ''
  for (let i = -4; i < 20; i++) {
    d += `<rect x="${i * 60 - 100}" y="-20" width="18" height="500" fill="${color}" opacity="0.06" transform="rotate(18 400 225)"/>`
  }
  return d
}

function arc(color) {
  return `<path d="M 0 450 A 500 500 0 0 1 800 450" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.3"/>
    <path d="M 0 450 A 380 380 0 0 1 620 130" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.22"/>`
}

const VARIANTS = { waves, rings, grid, dots, diagonalBars, arc }

function svgCard({ id, hueA, hueB, variant, label }) {
  const gradId = `g-${id}`
  let pattern = ''
  if (variant === 'waves') pattern = waves(hueA, hueB)
  else if (variant === 'rings') pattern = rings(560, 160, hueA) + rings(160, 340, hueB)
  else if (variant === 'grid') pattern = grid(hueA)
  else if (variant === 'dots') pattern = dots(hueA)
  else if (variant === 'diagonalBars') pattern = diagonalBars(hueA)
  else if (variant === 'arc') pattern = arc(hueA)

  return `<svg width="800" height="450" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${SURFACE}"/>
      <stop offset="55%" stop-color="${CANVAS}"/>
      <stop offset="100%" stop-color="${hueB}" stop-opacity="0.22"/>
    </linearGradient>
    <radialGradient id="glow-${id}" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${hueA}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${hueA}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="800" height="450" fill="url(#${gradId})"/>
  <rect width="800" height="450" fill="url(#glow-${id})"/>
  <g clip-path="url(#clip-${id})">${pattern}</g>
  <clipPath id="clip-${id}"><rect width="800" height="450"/></clipPath>
  <text x="40" y="405" font-family="Poppins, sans-serif" font-size="15" letter-spacing="2" fill="${hueA}" opacity="0.55">${label.toUpperCase()}</text>
</svg>`
}

const facilities = [
  { file: 'pool', label: 'Infinity Sky Pool', hueA: INDIGO_SOFT, hueB: GOLD, variant: 'waves' },
  { file: 'gym', label: 'Apex Fitness Studio', hueA: GOLD, hueB: INDIGO, variant: 'diagonalBars' },
  { file: 'cinema', label: 'Aurora Screening Room', hueA: INDIGO, hueB: GOLD_SOFT, variant: 'rings' },
  { file: 'tennis', label: 'Championship Tennis Court', hueA: GOLD_SOFT, hueB: INDIGO_SOFT, variant: 'grid' },
  { file: 'yoga', label: 'Serenity Yoga Deck', hueA: GOLD, hueB: INDIGO_SOFT, variant: 'arc' },
  { file: 'function-room', label: 'The Grand Function Room', hueA: INDIGO_SOFT, hueB: GOLD, variant: 'dots' },
  { file: 'spa', label: 'Serenity Spa & Sauna', hueA: GOLD_SOFT, hueB: INDIGO, variant: 'waves' },
  { file: 'kids-lounge', label: 'Junior Play Lounge', hueA: INDIGO, hueB: GOLD, variant: 'dots' },
]

const restaurants = [
  { file: 'ember-oak', label: 'Ember & Oak', hueA: GOLD, hueB: INDIGO, variant: 'diagonalBars' },
  { file: 'aria-trattoria', label: 'Aria Trattoria', hueA: GOLD_SOFT, hueB: INDIGO_SOFT, variant: 'arc' },
  { file: 'koi-copper', label: 'Koi & Copper', hueA: INDIGO_SOFT, hueB: GOLD, variant: 'rings' },
  { file: 'morning-room', label: 'The Morning Room', hueA: GOLD, hueB: INDIGO_SOFT, variant: 'grid' },
]

const events = [
  { file: 'wine-tasting', label: 'Sunset Rooftop Wine Tasting', hueA: GOLD, hueB: INDIGO_SOFT, variant: 'rings' },
  { file: 'yoga-brunch', label: 'Morning Flow Yoga & Brunch', hueA: GOLD_SOFT, hueB: INDIGO, variant: 'arc' },
  { file: 'kids-craft', label: "Junior Explorers Craft Day", hueA: INDIGO, hueB: GOLD, variant: 'dots' },
  { file: 'cinema-night', label: 'Summer Night Cinema', hueA: INDIGO_SOFT, hueB: GOLD_SOFT, variant: 'grid' },
  { file: 'chefs-table', label: "Chef's Table", hueA: GOLD, hueB: INDIGO, variant: 'waves' },
  { file: 'fitness-challenge', label: 'Community Fitness Challenge', hueA: INDIGO, hueB: GOLD_SOFT, variant: 'diagonalBars' },
]

function write(list, folder) {
  const dir = join(outRoot, folder)
  mkdirSync(dir, { recursive: true })
  for (const item of list) {
    const svg = svgCard({ id: `${folder}-${item.file}`, hueA: item.hueA, hueB: item.hueB, variant: item.variant, label: item.label })
    writeFileSync(join(dir, `${item.file}.svg`), svg, 'utf-8')
  }
}

write(facilities, 'facilities')
write(restaurants, 'restaurants')
write(events, 'events')

console.log(`Generated ${facilities.length + restaurants.length + events.length} SVG images.`)
