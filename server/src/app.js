import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js'
import routes from './routes/index.js'

const app = express()

app.use(
  cors({
    origin: env.corsOrigins.includes('*') ? true : env.corsOrigins,
    credentials: true,
  }),
)
app.use(express.json())
app.use(morgan('dev'))

app.use('/api', routes)

app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
