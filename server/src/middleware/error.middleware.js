import { ApiError } from '../utils/ApiError.js'

export const notFoundMiddleware = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
}

export const errorMiddleware = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That upload is too large. Please use a smaller file.' })
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: `Duplicate value for ${err.meta?.target}` })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' })
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
