import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

// Name of the httpOnly cookie the API sets on login (server/src/config/authCookie.js).
const AUTH_COOKIE = 'stayflow_token'

/**
 * Whether the request carries a session cookie at all.
 *
 * This is the only auth signal available before the page renders: the cookie is
 * httpOnly, so client code cannot read it, and the persisted user in
 * localStorage is editable by whoever is sitting at the browser. On the server
 * the real cookie is visible, which is enough to bounce a signed-out visitor
 * straight to the login screen instead of streaming them a portal shell that
 * will empty itself a moment later.
 *
 * It deliberately does not verify the token — that is the API's job on every
 * request, and duplicating it here would mean a second place that could be
 * wrong about who someone is. On the client it answers true and leaves the
 * decision to useRequireAuth.
 */
export const hasSessionCookie = createIsomorphicFn()
  .server(() => Boolean(getCookie(AUTH_COOKIE)))
  .client(() => true)
