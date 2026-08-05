// Single source of truth for the security headers on the HTML app.
//
// helmet (server/src/app.js) only covers the Express API. In production the HTML,
// JS and CSS are served by Vercel, which applied no headers at all before this —
// so the portal was framable and had no CSP. Vercel reads its copy from
// vercel.json, the merged single-process server reads this module directly, and
// scripts/security-headers.test.mjs asserts the two never drift apart.

// Origins the app genuinely needs. Anything not listed here is denied.
//   fonts.googleapis.com / fonts.gstatic.com  -> the two webfont links in __root.tsx
//   api.dicebear.com                          -> generated resident avatars (src/lib/avatar.ts)
//   api.open-meteo.com                        -> dashboard weather widget (src/lib/weather.ts)
//
// script-src keeps 'unsafe-inline' because TanStack Start emits its hydration
// payload as an inline <script> and Vercel's static headers cannot carry a
// per-request nonce. Recorded as a known limitation in docs/SECURITY.md; every
// other directive is strict, and frame-ancestors 'none' is what closes the
// clickjacking hole this header set exists for.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://api.dicebear.com",
  "connect-src 'self' https://api.open-meteo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  // Belt-and-braces alongside frame-ancestors, for anything that predates CSP2.
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 2 years, subdomains included, preload-eligible.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // No feature in this app needs any of these.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-DNS-Prefetch-Control': 'off',
}

export const applySecurityHeaders = (res) => {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value)
  }
}
