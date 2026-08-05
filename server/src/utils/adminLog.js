import { AdminActionEventModel } from '../models/adminActionEvent.model.js'
import { logger } from './logger.js'

/**
 * Records an admin action. Fire-and-forget, same as logAuthEvent: audit logging must
 * never block or fail the actual request, so failures are not rethrown.
 *
 * A dropped audit row is still a real incident — an audit trail with silent
 * gaps cannot be relied on afterwards — so the failure is logged at error level
 * with the details needed to reconstruct the missing entry, rather than as a
 * console line nothing alerts on.
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
    logger.error('audit.admin_action_write_failed', {
      requestId: req.id,
      actorUserId: req.user.sub,
      action,
      resourceType,
      resourceId,
      message: err.message,
    })
  })
}
