import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import { apiRouter } from './routes/index.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'

export const app = express()

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api', apiRouter)

app.use(notFoundHandler)
app.use(errorHandler)
