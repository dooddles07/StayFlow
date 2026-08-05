import * as Sentry from '@sentry/node'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import {
  errorMiddleware,
  notFoundMiddleware,
} from './middleware/error.middleware.js'
import { originCheck } from './middleware/originCheck.middleware.js'
import { apiLimiter } from './middleware/rateLimit.middleware.js'
import { accessLog, requestId } from './middleware/requestContext.middleware.js'
import { healthRouter } from './routes/health.routes.js'
import routes from './routes/index.js'

const app = express()

// Production chain is browser -> Vercel edge rewrite -> Render router -> here,
// so two proxies sit in front. Trusting only one made req.ip resolve to the
// Render router — an address shared by every user — which turned the 10-attempt
// login limiter into a single global budget any visitor could exhaust for
// everybody. TRUST_PROXY_HOPS exists so the count can be corrected from config
// if the topology changes without a code deploy.
app.set(
  'trust proxy',
  Number(process.env.TRUST_PROXY_HOPS) || (env.isProd ? 2 : 1),
)

// Security headers (HSTS, X-Content-Type-Options, frameguard, etc.). CORP is disabled so the
// explicit CORS allowlist below governs cross-origin access on its own (this is a JSON API).
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(compression())
app.use(requestId)

// Wildcard + credentials is forbidden by the CORS spec and unsafe; only reflect an
// explicit allowlist with credentials. Empty allowlist => cross-origin denied (same-origin still works).
if (env.corsOrigins.includes('*')) {
  app.use(cors({ origin: true, credentials: false }))
} else if (env.corsOrigins.length > 0) {
  app.use(cors({ origin: env.corsOrigins, credentials: true }))
}

// Health is mounted before the rate limiter and before the access log: Render
// probes it continuously, so inside the limiter it consumed the shared /api
// budget, and inside the access log it drowned every other line.
app.use('/api', healthRouter)

app.use(accessLog)

// One limit for every route. The 5mb carve-out for /events, /facilities and
// /restaurants existed because those three stored base64 photo data URIs;
// photos now upload straight from the browser to Cloudinary and only a URL
// reaches this API, so no endpoint has a reason to accept a large body.
app.use(express.json({ limit: '100kb' }))

app.use('/api', originCheck, apiLimiter, routes)

app.use(notFoundMiddleware)

// Ahead of errorMiddleware, which converts everything into a JSON response and
// would otherwise leave Sentry nothing to see. No-op unless instrument.mjs ran
// with a DSN set. Expected 4xx (bad input, wrong role, rate limit) is not worth
// an alert, so only 5xx and unhandled throws are reported.
Sentry.setupExpressErrorHandler(app, {
  shouldHandleError: (error) => (error.statusCode ?? 500) >= 500,
})

app.use(errorMiddleware)

export default app
