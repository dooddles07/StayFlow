import { prisma } from '../config/db.js'
import { env } from '../config/env.js'
import { logger } from './logger.js'

// auth_events and notifications grow with traffic rather than with the size of
// the property, so on a fixed storage quota they are what eventually fills it.
// There is no scheduler on this deployment (no cron service, no worker), so the
// API process sweeps its own tables on a timer.
const SWEEP_INTERVAL_MS = 60 * 60 * 1000

// The process is restarted on every deploy and after each idle spin-down, so a
// sweep on boot is what actually runs on a low-traffic service. Delayed so it
// never competes with startup for the connection pool.
const FIRST_SWEEP_DELAY_MS = 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

const cutoff = (days) => new Date(Date.now() - days * DAY_MS)

let running = false

async function sweep() {
  if (running) return
  running = true
  try {
    const { authEventDays, notificationDays } = env.retention

    if (authEventDays > 0) {
      const { count } = await prisma.authEvent.deleteMany({
        where: { createdAt: { lt: cutoff(authEventDays) } },
      })
      if (count > 0) logger.info('retention.auth_events_pruned', { count })
    }

    if (notificationDays > 0) {
      // Only read notifications age out. An unread one is still owed to
      // someone, however old it is.
      const { count } = await prisma.appNotification.deleteMany({
        where: { read: true, createdAt: { lt: cutoff(notificationDays) } },
      })
      if (count > 0) logger.info('retention.notifications_pruned', { count })
    }
  } catch (err) {
    // A failed sweep is a capacity problem, not a request problem — log it and
    // let the next tick retry rather than taking the process down.
    logger.error('retention.sweep_failed', { message: err.message })
  } finally {
    running = false
  }
}

/**
 * Starts the retention sweeper. Both timers are unref'd so they never keep the
 * process alive on their own or interfere with graceful shutdown.
 */
export function startRetentionSweeper() {
  const { authEventDays, notificationDays } = env.retention
  if (authEventDays <= 0 && notificationDays <= 0) {
    logger.info('retention.disabled')
    return
  }
  setTimeout(sweep, FIRST_SWEEP_DELAY_MS).unref()
  setInterval(sweep, SWEEP_INTERVAL_MS).unref()
}
