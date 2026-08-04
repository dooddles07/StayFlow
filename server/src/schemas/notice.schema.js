import { z } from 'zod'
import { nonEmptyString } from './shared.js'

// postedBy/postedAt are always server-set in the controller — never part of the
// client-facing schema.
export const noticeCreateSchema = z.object({
  title: nonEmptyString,
  category: nonEmptyString,
  body: nonEmptyString,
  pinned: z.boolean().optional(),
})

export const noticeUpdateSchema = noticeCreateSchema.partial()
