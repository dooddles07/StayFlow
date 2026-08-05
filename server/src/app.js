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

// Only the three resources that store base64 photos as data URIs need a large
// body. Applying 5mb everywhere meant an unauthenticated POST /api/auth/login
// could hand the parser 5mb of JSON to chew on, per request.
const largeJson = express.json({ limit: '5mb' })
for (const path of ['/api/events', '/api/facilities', '/api/restaurants']) {
  app.use(path, largeJson)
}
app.use(express.json({ limit: '100kb' }))

app.use('/api', originCheck, apiLimiter, routes)

app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
