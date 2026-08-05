import { prisma } from '../config/db.js'

// Write-only by design, same as AuthEventModel: the `list` helper here was
// routed nowhere and read by nothing. Query the table directly when auditing.
export const AdminActionEventModel = {
  record: (data) => prisma.adminActionEvent.create({ data }),
}
