import * as Sentry from '@sentry/react'

// Browser-side error reporting. Server-side errors are reported separately by
// the API's own Sentry setup (server/instrument.mjs) — this covers the failures
// that only ever happen in a user's browser and would otherwise be invisible.
//
// Off by default: without VITE_SENTRY_DSN nothing initialises and nothing is
// sent, which is the case locally, in CI, and in any fork of this repo.
let started = false

export function initErrorTracking(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (started || !dsn || typeof window === 'undefined') return
  started = true

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Errors only. Tracing and session replay have separate free-plan quotas
    // and would be spent long before they answered a question worth asking.
    tracesSampleRate: 0,
    // Emails, unit numbers and guest names are all over this UI. None of it
    // belongs in a third-party error store.
    sendDefaultPii: false,
  })
}
