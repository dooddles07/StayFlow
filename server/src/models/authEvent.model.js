import { prisma } from '../config/db.js'

// Write-only by design: nothing in the API reads auth events back. The `list`
// helper that used to sit here was routed nowhere and had no UI, so it was dead
// code guarding sensitive data. Query the table directly when investigating an
// incident. Retention is unbounded and these rows hold email/ip/userAgent —
// tracked as remaining debt in docs/SECURITY.md.
export const AuthEventModel = {
  record: (data) => prisma.authEvent.create({ data }),
}
