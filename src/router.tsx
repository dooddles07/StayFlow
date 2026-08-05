import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { RouteError, RouteNotFound } from '#/components/stayflow/route-fallback'
import { createCspNonce } from '#/lib/csp'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: RouteNotFound,
    defaultErrorComponent: RouteError,
    // Stamps the nonce onto the inline scripts the router streams, matching the
    // policy createCspNonce puts on the response.
    ssr: { nonce: createCspNonce() },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
