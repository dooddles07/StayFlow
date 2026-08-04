import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Same .env loading approach as reset-test-passwords.js — works from root or server/.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

// One-time repair for bookings written with a corrupted timeSlot: a direct API call
// bypassed the UI's slot constants (src/lib/booking-slots.ts) and wrote the Unicode
// replacement character (U+FFFD) in place of the en dash. See docs/ACTIVITY-LOG.md.
async function main() {
  const corrupted = await prisma.booking.findMany({
    where: { timeSlot: { contains: '�' } },
  })

  if (corrupted.length === 0) {
    console.log('No corrupted booking timeSlots found.')
    return
  }

  for (const booking of corrupted) {
    const fixed = booking.timeSlot.replaceAll('�', '–')
    await prisma.booking.update({ where: { id: booking.id }, data: { timeSlot: fixed } })
    console.log(`Fixed booking ${booking.id}: "${booking.timeSlot}" -> "${fixed}"`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
