// Loaded via `node --import ./instrument.mjs server.js`. Sentry's auto
// instrumentation patches modules as they load, so this has to run before
// anything else imports express or prisma — that is the only reason it is a
// separate file instead of a few lines at the top of server.js.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import * as Sentry from '@sentry/node'

// server/src/config/env.js has not run yet, so load the same .env file it does.
const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../.env'), quiet: true })

// No DSN => Sentry is never initialised and nothing leaves the process. That is
// the default locally and in CI.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // Errors only. Performance spans have their own (smaller) free-plan quota
    // and would be exhausted by health checks long before they told us anything.
    tracesSampleRate: 0,
    // The request body can hold a password or a reset token, and headers hold
    // the auth cookie. Neither belongs in a third-party error store.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
        delete event.request.headers
      }
      return event
    },
  })
}
