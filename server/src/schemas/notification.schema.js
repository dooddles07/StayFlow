import { z } from 'zod'
import { nonEmptyString } from './shared.js'

// kind/title/body non-empty and the residentId-XOR-staffId rule are already
// enforced inline in the controller — this only adds the type/shape layer.
export const notificationCreateSchema = z.object({
  kind: nonEmptyString,
  title: nonEmptyString,
  body: nonEmptyString,
  residentId: z.string().optional(),
  staffId: z.string().optional(),
})

// Upper bound matches the clamp already applied in notification.model.js, so a
// caller asking for more gets a clear 400 rather than a silently smaller page.
export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
})
