import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { ApiError } from '../utils/ApiError.js'

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors })
    return
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
