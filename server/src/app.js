import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js'
import routes from './routes/index.js'

const app = express()

app.set('trust proxy', 1)

// Security headers (HSTS, X-Content-Type-Options, frameguard, etc.). CORP is disabled so the
// explicit CORS allowlist below governs cross-origin access on its own (this is a JSON API).
app.use(helmet({ crossOriginResourcePolicy: false }))

// Wildcard + credentials is forbidden by the CORS spec and unsafe; only reflect an
// explicit allowlist with credentials. Empty allowlist => cross-origin denied (same-origin still works).
if (env.corsOrigins.includes('*')) {
  app.use(cors({ origin: true, credentials: false }))
} else if (env.corsOrigins.length > 0) {
  app.use(cors({ origin: env.corsOrigins, credentials: true }))
}
// Default 100kb is too small for a base64-encoded photo upload (event/notice images are
// stored as data URIs, not files); 5mb comfortably covers the 2MB raw-file cap those flows enforce.
app.use(express.json({ limit: '5mb' }))
app.use(morgan('dev'))

app.use('/api', routes)

app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
