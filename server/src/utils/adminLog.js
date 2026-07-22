import { AdminActionEventModel } from '../models/adminActionEvent.model.js'

/**
 * Records an admin action. Fire-and-forget, same as logAuthEvent: audit logging must
 * never block or fail the actual request, so failures are swallowed (and surfaced to
 * the server console only).
 */
export function logAdminAction(req, action, resourceType, resourceId) {
  AdminActionEventModel.record({
    actorUserId: req.user.sub,
    actorEmail: req.user.email,
    actorRole: req.user.role,
    action,
    resourceType,
    resourceId,
  }).catch((err) => {
    console.error(`[audit] failed to record admin action ${action} ${resourceType}:`, err.message)
  })
}
