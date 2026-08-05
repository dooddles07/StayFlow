// Mirrors the PortalRole enum in prisma/schema.prisma. Kept as a module-level
// constant so guards can reject a typo'd role name at boot instead of silently
// building a rule that can never match.
export const ROLES = Object.freeze(['MEMBER', 'STAFF', 'MANAGEMENT'])

// Read access that is intentionally open to every signed-in user (shared
// property information: facilities, restaurants, tables, notices, events).
// Spelling it out beats omitting a role list, which used to mean "open" by
// accident rather than by decision.
export const ALL_ROLES = ROLES

export const STAFF_ROLES = Object.freeze(['STAFF', 'MANAGEMENT'])

export const assertKnownRoles = (roles, context) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new Error(`${context}: a non-empty role list is required`)
  }
  for (const role of roles) {
    if (!ROLES.includes(role)) {
      throw new Error(
        `${context}: unknown role "${role}" (expected one of ${ROLES.join(', ')})`,
      )
    }
  }
}
