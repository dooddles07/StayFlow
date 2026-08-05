import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

export const notFoundMiddleware = (req, res) => {
  res
    .status(404)
    .json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
}

export const errorMiddleware = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json({ error: err.message, details: err.details })
  }
  if (err.type === 'entity.too.large') {
    return res
      .status(413)
      .json({ error: 'That upload is too large. Please use a smaller file.' })
  }
  if (err.code === 'P2002') {
    // The constraint's column names used to be echoed to the caller, which
    // handed an attacker a free map of the schema. The user-facing message
    // never needed them.
    logger.warn('db.unique_violation', {
      requestId: req.id,
      target: err.meta?.target,
    })
    return res.status(409).json({ error: 'That value is already in use.' })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' })
  }
  // P2003 is Prisma's own FK-violation code, but a plain RESTRICT constraint (no
  // onDelete specified — the default here) surfaces instead as a PrismaClientUnknown
  // RequestError with no `.code` at all, just the raw Postgres error in the message
  // (confirmed empirically: SQLSTATE 23001, "violates RESTRICT setting of foreign key
  // constraint"). Match the message text too, or this never fires for the case that
  // actually happens in this schema.
  if (
    err.code === 'P2003' ||
    /foreign key constraint/i.test(err.message ?? '')
  ) {
    return res
      .status(409)
      .json({
        error:
          "Can't remove this — other records still reference it. Remove those first.",
      })
  }

  // Log named fields only. `console.error(err)` used to dump the whole Prisma
  // error object, and those embed the failing query's parameter values —
  // emails, names, phone numbers — straight into the log stream.
  logger.error('request.unhandled_error', {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    name: err.name,
    code: err.code,
    message: err.message,
    stack: err.stack,
  })
  // The request id goes back to the caller so a support report can be tied to
  // the log line above without exposing anything about the failure itself.
  res.status(500).json({ error: 'Internal server error', requestId: req.id })
}
