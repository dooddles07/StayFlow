import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader, getRequestUrl } from '@tanstack/react-start/server'

// Same-origin in production (frontend and API served by the same process/service).
// Override with VITE_API_URL for local dev if running the backend separately.
const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Fires when any request comes back 401 — the auth store registers a handler that
// clears the stale session and redirects to sign-in. Kept as an injectable callback
// (not a direct import) so this module never depends on the store module.
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

// `credentials: 'include'` only means something to a *browser* fetch — it tells the
// browser to attach its cookie jar. A loader's fetch during SSR runs in Node, which
// has no cookie jar at all, so the httpOnly auth cookie never reaches the API and
// every authenticated SSR request 401s silently. Forward the incoming request's
// Cookie header explicitly so server-rendered loaders authenticate the same way the
// browser would. The client branch is a no-op — the browser attaches its own cookies.
// Split via createIsomorphicFn (not a runtime `typeof window` check) because the
// server-only `getRequestHeader` import must never reach the client bundle at all.
const forwardedCookie = createIsomorphicFn()
  .server(() => {
    try {
      return getRequestHeader('cookie')
    } catch {
      // No active request context (e.g. server code running outside a request) — the
      // fetch proceeds unauthenticated rather than crashing the render.
      return undefined
    }
  })
  .client(() => undefined as string | undefined)

// Browser fetch resolves a relative path ("/api/...") against the current page's
// origin automatically; Node's fetch has no such concept and throws ("Failed to
// parse URL") on anything that isn't already absolute. When API_URL is relative
// (the same-origin merged-deployment default), resolve it against the incoming
// request's own origin during SSR — this is a single-service deployment, so that's
// always the right host to call.
const resolveApiUrl = createIsomorphicFn()
  .server((path: string) => {
    if (!API_URL.startsWith('/')) return `${API_URL}${path}`
    try {
      return `${getRequestUrl().origin}${API_URL}${path}`
    } catch {
      return `${API_URL}${path}`
    }
  })
  .client((path: string) => `${API_URL}${path}`)

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cookie = forwardedCookie()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (cookie) headers.cookie = cookie

  const res = await fetch(resolveApiUrl(path), {
    ...options,
    // Send/receive the httpOnly auth cookie (the JWT is no longer stored in JS).
    credentials: 'include',
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // Only the browser holds a session to invalidate — SSR loaders never persist one.
    // Never for /auth/login itself: a failed login attempt is not an expired session,
    // even when a stale user is still persisted from a previous session, and must be
    // left for the login form's own catch block to show as a normal credentials error.
    if (res.status === 401 && typeof window !== 'undefined' && path !== '/auth/login') onUnauthorized?.()
    throw new ApiError(res.status, body.error ?? `Request failed with status ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// --- Shared read cache -------------------------------------------------------
// Only for reference reads that are shared across pages and low-churn (facilities,
// restaurants, notices, events). Two things at once:
//   1. In-flight dedupe — concurrent callers for the same path share one request
//      (kills the dashboard's double /notices fetch).
//   2. Short TTL — repeat mounts within the window reuse the last value instead of
//      re-hitting the network on every navigation.
// Per-resident lists (bookings/guests/reservations/notifications) are NOT cached —
// they mutate and must read fresh right after a write.
interface CacheEntry {
  expires: number
  promise: Promise<unknown>
}
const readCache = new Map<string, CacheEntry>()

export function cachedGet<T>(path: string, ttlMs = 30_000): Promise<T> {
  const hit = readCache.get(path)
  if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>

  const promise = request<T>(path)
  readCache.set(path, { expires: Date.now() + ttlMs, promise })
  // A failed request must not stay cached — drop it so the next call retries.
  promise.catch(() => {
    if (readCache.get(path)?.promise === promise) readCache.delete(path)
  })
  return promise
}

// Drop every cached path that starts with the given prefix (call after a write).
export function invalidateCache(prefix: string): void {
  for (const key of readCache.keys()) {
    if (key.startsWith(prefix)) readCache.delete(key)
  }
}
