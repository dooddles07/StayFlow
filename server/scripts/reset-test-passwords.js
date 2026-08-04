import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { BCRYPT_ROUNDS } from '../src/utils/password.js'
import { env } from '../src/config/env.js'

// Load the repo's single .env by file-relative path, not CWD — this script needs to
// work whether it's run from root or from server/, and there's no server/.env to fall
// back on (see docs/SECURITY.md#environment-variables).
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

const TEST_PASSWORD = process.env.TEST_PASSWORD
const ACCOUNTS = [
  'member@stayflow.io',
  'staff@stayflow.io',
  'admin@stayflow.io',
]

async function main() {
  // DATABASE_URL points at prod (this stack has no separate local DB) — refuse to
  // silently reset real accounts if NODE_ENV=production or --force isn't passed.
  if (env.isProd && !process.argv.includes('--force')) {
    console.error(
      'Refusing to run with NODE_ENV=production. Pass --force if you are certain this DATABASE_URL is not production.',
    )
    process.exit(1)
  }

  if (!TEST_PASSWORD) {
    console.error(
      'Set TEST_PASSWORD env var before running this script (no hardcoded default).',
    )
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS)

  for (const email of ACCOUNTS) {
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash },
    })
    console.log(`Reset password for ${user.email} (role: ${user.role})`)
  }

  console.log(`\nAll set. Test password: ${TEST_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
