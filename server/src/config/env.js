import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'

// Load the repo-root .env explicitly rather than relying on process.cwd().
// A bare `dotenv/config` resolves against the working directory, so running the
// API from the repo root found the file and running it from server/ did not —
// which is why a byte-identical copy of the secrets had been created at
// server/.env. That second file is no longer read: two files that dotenv merges
// first-wins had already drifted apart, so a key defined in both silently used
// whichever copy loaded first. One file, one place to rotate. Values already
// present in the environment (Render, CI) always win: dotenv does not overwrite.
const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../../../.env'), quiet: true })

// DIRECT_URL is read by schema.prisma for migrations and advisory locks. Left
// out of this list it failed during `prisma migrate deploy` in the build rather
// than at startup with the same clear message every other required var gets.
const required = ['DATABASE_URL', 'DIRECT_URL', 'JWT_SECRET']
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
}

// A short/weak secret makes every session forgeable offline — role/residentId/staffId
// are trusted straight off the signed JWT payload, so this is the app's actual root of trust.
const MIN_JWT_SECRET_LENGTH = 32
if (process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  throw new Error(
    `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (got ${process.env.JWT_SECRET.length}).`,
  )
}

const isProd = process.env.NODE_ENV === 'production'

// Fail closed rather than warn. Without a mail key the reset/email-change link is
// never delivered (silent permanent lockout) and the only place it exists is the
// server log, which turns the log stream into a store of live account-takeover
// tokens. Without APP_URL the link is built against corsOrigins[0] — empty in the
// Render deployment — and falls through to localhost, so it is unusable anyway.
if (isProd) {
  const requiredInProd = ['RESEND_API_KEY', 'APP_URL']
  for (const key of requiredInProd) {
    if (!process.env[key]) {
      throw new Error(
        `Missing required env var in production: ${key}. Password-reset and email-change flows cannot work without it.`,
      )
    }
  }
}

// Fail closed: no wildcard default. Unset CORS_ORIGIN => [] (only same-origin allowed,
// which never triggers CORS anyway). Cross-origin access requires an explicit allowlist.
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export const env = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins,
  // Base URL of the frontend, used to build password-reset links and as the one
  // Origin allowed on state-changing requests. The localhost fallback is scoped
  // to development on purpose: production throws above if APP_URL is unset, so
  // it can never be reached there, and leaving it unscoped meant an empty
  // allowlist would have turned the origin check off in local development.
  appUrl:
    process.env.APP_URL ||
    corsOrigins[0] ||
    (isProd ? '' : 'http://localhost:3000'),
  // Email delivery (Resend). Without a key, mail is logged to the console only.
  resendApiKey: process.env.RESEND_API_KEY || '',
  // Must be a Resend-verified domain in production. The shared sandbox sender
  // (onboarding@resend.dev) only delivers to your own Resend account email.
  mailFrom: process.env.MAIL_FROM || 'StayFlow <onboarding@resend.dev>',
  // Image hosting. The API never receives the file: it signs an upload the
  // browser sends straight to Cloudinary, so photos never occupy a Postgres
  // column or the request body. Unset => the signature endpoint 503s and the
  // admin UI falls back to pasting a URL.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'stayflow',
  },
  // Error tracking. Unset => Sentry is never initialised and nothing is sent.
  sentryDsn: process.env.SENTRY_DSN || '',
  // Row retention. Both tables grow per-request and would otherwise consume the
  // whole database quota; 0 disables the prune for that table.
  retention: {
    authEventDays: Number(process.env.AUTH_EVENT_RETENTION_DAYS ?? 90),
    notificationDays: Number(process.env.NOTIFICATION_RETENTION_DAYS ?? 180),
  },
}
