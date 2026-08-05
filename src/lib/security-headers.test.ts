import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { STATIC_SECURITY_HEADERS, buildCsp } from '#/lib/security-headers'

// vercel.json is applied by the platform and never imported by the app, so
// nothing else would notice if the two definitions drifted apart.
const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: Array<{
    source: string
    headers: Array<{ key: string; value: string }>
  }>
}

const deployedHeaders = Object.fromEntries(
  vercelConfig.headers
    .flatMap((entry) => entry.headers)
    .map((header) => [header.key, header.value]),
)

describe('deployed security headers match the source of truth', () => {
  it.each(Object.entries(STATIC_SECURITY_HEADERS))('sends %s', (key, value) => {
    expect(deployedHeaders[key]).toBe(value)
  })

  it('does not add headers the app does not know about', () => {
    expect(Object.keys(deployedHeaders).sort()).toEqual(
      Object.keys(STATIC_SECURITY_HEADERS).sort(),
    )
  })

  // A static CSP here would be sent alongside the per-request one, and two
  // policies are enforced as their intersection — the nonce policy would be
  // silently narrowed or the page would break.
  it('leaves the Content-Security-Policy to the SSR handler', () => {
    expect(deployedHeaders['Content-Security-Policy']).toBeUndefined()
  })
})

describe('buildCsp', () => {
  it('allows scripts only by nonce, never inline', () => {
    const policy = buildCsp('abc123')
    expect(policy).toContain("script-src 'self' 'nonce-abc123'")
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'")
  })

  it('keeps the origins the app actually talks to', () => {
    const policy = buildCsp('abc123')
    for (const origin of [
      'https://res.cloudinary.com',
      'https://api.dicebear.com',
      'https://api.open-meteo.com',
      'https://fonts.gstatic.com',
    ]) {
      expect(policy).toContain(origin)
    }
  })

  it('keeps the clickjacking and injection floor', () => {
    const policy = buildCsp('abc123')
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'self'")
    expect(policy).toContain("form-action 'self'")
  })
})
