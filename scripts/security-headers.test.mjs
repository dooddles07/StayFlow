import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SECURITY_HEADERS, applySecurityHeaders } from './security-headers.mjs'

// vitest rewrites import.meta.url away from a file: URL, so resolve from the
// project root instead (vitest sets cwd to the config directory).
const vercelConfig = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8'),
)

describe('security headers', () => {
  it('closes the clickjacking and content-sniffing holes', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("object-src 'none'")
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("base-uri 'self'")
  })

  it('does not allow eval or a wildcard default-src', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy']
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("default-src 'self'")
    expect(csp).not.toMatch(/default-src[^;]*\*/)
  })

  it('applies every header to a response', () => {
    const set = {}
    applySecurityHeaders({ setHeader: (k, v) => (set[k] = v) })
    expect(set).toEqual(SECURITY_HEADERS)
  })

  // The two deploy paths (Vercel static headers, merged single-process server)
  // read from different places. Without this, one can be hardened and the other
  // silently left open.
  it('stays in sync with vercel.json', () => {
    const rule = vercelConfig.headers?.find((h) => h.source === '/(.*)')
    expect(rule, 'vercel.json must define headers for all paths').toBeDefined()
    const fromVercel = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]))
    expect(fromVercel).toEqual(SECURITY_HEADERS)
  })
})
