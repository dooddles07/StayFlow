import { describe, expect, it } from 'vitest'
import { imageUrl } from './shared.js'

describe('imageUrl', () => {
  it.each([
    'https://res.cloudinary.com/demo/image/upload/v1/pool.webp',
    '/images/facilities/pool.webp',
  ])('accepts %s', (value) => {
    expect(imageUrl.safeParse(value).success).toBe(true)
  })

  it.each([
    ['javascript:alert(1)', 'a script URL'],
    ['data:text/html;base64,PHNjcmlwdD4=', 'an inline document'],
    ['http://res.cloudinary.com/demo/pool.webp', 'plain http'],
    ['//evil.example.com/pool.webp', 'a protocol-relative off-site link'],
    ['   ', 'blank'],
  ])('rejects %s (%s)', (value) => {
    expect(imageUrl.safeParse(value).success).toBe(false)
  })
})
