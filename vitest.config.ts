import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [viteReact()],
  resolve: {
    alias: [{ find: '#', replacement: path.resolve(__dirname, 'src') }],
  },
  test: {
    environment: 'jsdom',
    include: [
      'src/**/*.test.{ts,tsx}',
      'server/**/*.test.js',
      'scripts/**/*.test.mjs',
    ],
    setupFiles: ['./vitest.setup.ts'],
    // A ratchet, not a target. The numbers sit just under what the suite
    // covers today so coverage can only go up: deleting a test to make a
    // change pass now fails the run instead of passing quietly.
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 82,
        lines: 87,
      },
    },
  },
})
