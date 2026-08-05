import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'

// Load the repo-root .env explicitly rather than relying on process.cwd().
// A bare `dotenv/config` resolves against the working directory, so running the
// API from the repo root found the file and running it from server/ did not —
// which is why a byte-identical copy of the secrets had been created at
// server/.env. One file, one place to rotate. Values already present in the
// environment (Render, CI) always win: dotenv does not overwrite.
const here = path.dirname(fileURLToPath(import.meta.url))
for (const candidate of [
  path.resolve(here, '../../../.env'), // repo root
  path.resolve(here, '../../.env'), // server/ — legacy location, still honoured
]) {
  dotenv.config({ path: candidate, quiet: true })
}

const required = ['DATABASE_URL', 'JWT_SECRET']
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
  // Base URL of the frontend, used to build password-reset links.
  appUrl: process.env.APP_URL || corsOrigins[0] || 'http://localhost:3000',
  // Email delivery (Resend). Without a key, mail is logged to the console only.
  resendApiKey: process.env.RESEND_API_KEY || '',
  // Must be a Resend-verified domain in production. The shared sandbox sender
  // (onboarding@resend.dev) only delivers to your own Resend account email.
  mailFrom: process.env.MAIL_FROM || 'StayFlow <onboarding@resend.dev>',
}
