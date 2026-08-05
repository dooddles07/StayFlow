import app from './src/app.js'
import { env } from './src/config/env.js'
import { prisma } from './src/config/db.js'
import { logger } from './src/utils/logger.js'

// How long in-flight requests get to finish before the process is forced down.
// Render sends SIGKILL 30s after SIGTERM, so stay comfortably inside that.
const SHUTDOWN_GRACE_MS = 15_000

let server = null
let shuttingDown = false

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) return
  shuttingDown = true
  logger.info('shutdown.start', { signal })

  // Force-exit timer in case a socket never drains. unref() so it is not itself
  // a reason for the process to stay alive.
  const forceTimer = setTimeout(() => {
    logger.error('shutdown.timeout', { signal, graceMs: SHUTDOWN_GRACE_MS })
    process.exit(1)
  }, SHUTDOWN_GRACE_MS)
  forceTimer.unref()

  try {
    // Stop accepting new connections and wait for in-flight requests. Without
    // this, every deploy dropped whatever was mid-flight.
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    await prisma.$disconnect()
    logger.info('shutdown.complete', { signal })
  } catch (err) {
    logger.error('shutdown.failed', { signal, message: err.message })
    exitCode = 1
  }
  clearTimeout(forceTimer)
  process.exit(exitCode)
}

const start = async () => {
  await prisma.$connect()
  logger.info('db.connected')

  server = app.listen(env.port, () => {
    logger.info('server.listening', {
      port: env.port,
      env: process.env.NODE_ENV ?? 'development',
    })
  })
}

start().catch((err) => {
  logger.error('server.start_failed', {
    message: err.message,
    stack: err.stack,
  })
  process.exit(1)
})

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    shutdown(signal)
  })
}

// Node terminates on an unhandled rejection by default, with no log of what the
// request was. Handle both explicitly so the cause is recorded and the process
// still drains rather than vanishing mid-request.
process.on('unhandledRejection', (reason) => {
  logger.error('process.unhandled_rejection', {
    message: reason?.message ?? String(reason),
    stack: reason?.stack,
  })
  shutdown('unhandledRejection', 1)
})

process.on('uncaughtException', (err) => {
  logger.error('process.uncaught_exception', {
    message: err.message,
    stack: err.stack,
  })
  shutdown('uncaughtException', 1)
})
