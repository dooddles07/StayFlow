import { env } from '../config/env.js'

// Minimal structured logger. No dependency: the whole requirement is "one JSON
// object per line, with a level, a timestamp and a stable event name, and never
// a secret". morgan('dev') was writing ANSI-coloured, timestamp-less, IP-less
// lines in production, which no log aggregator can parse or search.

// `silent` is above every real level, so nothing is emitted. Used by the test
// suite, which drives hundreds of requests through the real app and would
// otherwise bury the results in access-log lines.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 }
const threshold =
  LEVELS[process.env.LOG_LEVEL] ?? (env.isProd ? LEVELS.info : LEVELS.debug)

// Anything whose key looks like one of these is replaced before serialising.
// Covers accidental spread of a user row (passwordHash, resetTokenHash) and of
// request bodies (password, token).
const REDACT = /pass|secret|token|authorization|cookie|apikey|api_key/i

const redact = (value, depth = 0) => {
  if (value === null || typeof value !== 'object' || depth > 4) return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  const out = {}
  for (const [key, val] of Object.entries(value)) {
    out[key] = REDACT.test(key) ? '[redacted]' : redact(val, depth + 1)
  }
  return out
}

const write = (level, event, meta) => {
  if (LEVELS[level] < threshold) return
  const line = {
    level,
    event,
    time: new Date().toISOString(),
    ...redact(meta ?? {}),
  }
  const target = level === 'error' ? process.stderr : process.stdout
  if (env.isProd) {
    target.write(`${JSON.stringify(line)}\n`)
    return
  }
  const detail =
    Object.keys(line).length > 3 ? ` ${JSON.stringify(redact(meta ?? {}))}` : ''
  target.write(`${level.toUpperCase().padEnd(5)} ${event}${detail}\n`)
}

export const logger = {
  debug: (event, meta) => write('debug', event, meta),
  info: (event, meta) => write('info', event, meta),
  warn: (event, meta) => write('warn', event, meta),
  error: (event, meta) => write('error', event, meta),
}
