// One definition of the response security headers, so the static ones in
// vercel.json and the per-request Content-Security-Policy emitted by the SSR
// handler cannot drift apart unnoticed. security-headers.test.ts fails if they
// do.

// Directives that never depend on the request.
const STATIC_CSP_DIRECTIVES = [
  "default-src 'self'",
  // Google Fonts serves its stylesheet with an inline @import chain, and the
  // app sets a handful of gradient backgrounds through the style attribute.
  // Inline style is not a script execution vector, so this stays.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://api.dicebear.com https://res.cloudinary.com",
  "connect-src 'self' https://api.open-meteo.com https://api.cloudinary.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
]

/**
 * The router streams two inline scripts whose contents change per route, so
 * hashing them is not an option — they are allowed by nonce instead. Without a
 * nonce the policy would need 'unsafe-inline', which is the same as having no
 * script policy at all.
 */
export function buildCsp(nonce: string): string {
  return [`script-src 'self' 'nonce-${nonce}'`, ...STATIC_CSP_DIRECTIVES].join(
    '; ',
  )
}

// Everything that does not vary per request stays in vercel.json, where it also
// covers static assets that never reach the SSR handler.
export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-DNS-Prefetch-Control': 'off',
}
