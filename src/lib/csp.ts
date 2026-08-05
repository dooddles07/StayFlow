import { createIsomorphicFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { buildCsp } from './security-headers'

/**
 * Mints the per-request nonce and puts the matching policy on the response.
 *
 * The policy cannot live in vercel.json any more: a nonce is only useful if it
 * is unguessable and different every time, and a static config file cannot
 * produce one. Both halves are set here so they can never disagree.
 *
 * On the client this is a no-op — the browser reads the nonce back off the
 * rendered tags, which is what lets hydration reuse them.
 */
export const createCspNonce = createIsomorphicFn()
  .server((): string | undefined => {
    const nonce = crypto.randomUUID().replaceAll('-', '')
    setResponseHeader('Content-Security-Policy', buildCsp(nonce))
    return nonce
  })
  .client((): string | undefined => undefined)
