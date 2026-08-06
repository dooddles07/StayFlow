import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

// Replaces the `prisma` block in package.json, which Prisma 6 deprecates and
// Prisma 7 removes. The CLI loads this file itself; the server is plain JS and
// needs no TypeScript toolchain of its own.
//
// Declaring a config file also turns OFF the CLI's own .env loading, so the
// same repo-root file server/src/config/env.js reads has to be loaded here by
// module-relative path — resolving against process.cwd() would find it when the
// CLI is run from the repo root and miss it when run from server/.
//
// dotenv never overwrites a variable that is already set, so a real environment
// (Render, CI) still wins over this file.
const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../.env'), quiet: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
})
