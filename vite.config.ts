import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
// Required to deploy TanStack Start to Vercel: it compiles the SSR server into
// Vercel's expected output (.vercel/output). Without it, `vite build` emits
// dist/client + dist/server for a custom Node server, which Vercel cannot
// route — every path 404s.
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Sentry is enabled in production (src/lib/observability.ts) and without
  // source maps every reported stack trace is minified single-letter noise.
  // The maps are published rather than hidden: this repo is public MIT source,
  // so there is nothing to protect, and a reachable .map is what lets Sentry
  // resolve a frame without an upload token in the build.
  build: { sourcemap: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
})

export default config
