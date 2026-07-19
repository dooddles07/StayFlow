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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    // Send/receive the httpOnly auth cookie (the JWT is no longer stored in JS).
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
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
