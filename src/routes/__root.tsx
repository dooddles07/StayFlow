import type { ReactNode } from 'react'
import * as React from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { initErrorTracking } from '#/lib/observability'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { TooltipProvider } from '#/components/ui/tooltip'
import { ToastViewport } from '#/components/ui/toast-viewport'
import { GlobalSearch } from '#/components/stayflow/global-search'
import { RootErrorBoundary } from '#/components/stayflow/root-error-boundary'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'StayFlow by QUAN7UM — Community Management Platform',
      },
      {
        name: 'description',
        content:
          'StayFlow is a premium luxury community management platform for members, staff, and management — facilities, dining, guests, events, and analytics in one place.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg?v=3',
      },
      {
        rel: 'icon',
        href: '/favicon.ico?v=3',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png?v=3',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  // In an effect so it only ever runs in the browser — Sentry's React SDK has
  // no business initialising during SSR.
  React.useEffect(() => {
    initErrorTracking()
  }, [])

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <RootErrorBoundary>
          <TooltipProvider delayDuration={200}>
            {children}
            <GlobalSearch />
            <ToastViewport />
          </TooltipProvider>
        </RootErrorBoundary>
        {/* Gated so the panel is provably dead code in a production bundle. */}
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
