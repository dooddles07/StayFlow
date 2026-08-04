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
