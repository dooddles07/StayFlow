import { PrismaClient } from '@prisma/client'

// `minimal` keeps Prisma from formatting the failing query — and the argument
// values inside it, which are residents' emails, names and phone numbers — into
// the error message that the error middleware and Sentry both see.
export const prisma = new PrismaClient({ errorFormat: 'minimal' })
