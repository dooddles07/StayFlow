import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TEST_PASSWORD = process.env.TEST_PASSWORD
const ACCOUNTS = ['member@stayflow.io', 'staff@stayflow.io', 'admin@stayflow.io']

async function main() {
  if (!TEST_PASSWORD) {
    console.error('Set TEST_PASSWORD env var before running this script (no hardcoded default).')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10)

  for (const email of ACCOUNTS) {
    const user = await prisma.user.update({ where: { email }, data: { passwordHash } })
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
