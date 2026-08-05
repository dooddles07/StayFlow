import { prisma } from '../config/db.js'

// Sign-in identity is case-insensitive. The stored value is always lowercase
// (create/reset/email-change all normalise), so every lookup must normalise too
// — otherwise a user who typed a capital letter, or who changed their email via
// the lowercase-normalising flow, could no longer sign in at all.
const normalizeEmail = (email) =>
  String(email ?? '')
    .trim()
    .toLowerCase()

export const UserModel = {
  normalizeEmail,
  findByEmail: (email) =>
    prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
      include: { resident: true, staff: true },
    }),
  findById: (id) =>
    prisma.user.findUnique({
      where: { id },
      include: { resident: true, staff: true },
    }),
  findByResidentId: (residentId) =>
    prisma.user.findUnique({ where: { residentId } }),
  findAuthState: (id) =>
    prisma.user.findUnique({
      where: { id },
      select: { id: true, tokenVersion: true, isActive: true },
    }),
  setLoginState: (id, data) => prisma.user.update({ where: { id }, data }),
  setResetToken: (id, resetTokenHash, resetTokenExpiresAt) =>
    prisma.user.update({
      where: { id },
      data: { resetTokenHash, resetTokenExpiresAt },
    }),
  findByResetTokenHash: (resetTokenHash) =>
    prisma.user.findUnique({ where: { resetTokenHash } }),
  // Consume a reset: set new password, clear reset fields, revoke all existing sessions, clear any lock.
  // Also clears mustChangePassword — a public password-reset equally proves the
  // resident just set their own password, same as the in-app change-password flow.
  applyPasswordReset: (id, passwordHash) =>
    prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        tokenVersion: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
        mustChangePassword: false,
      },
    }),
  // Change password for an authenticated user. Bumps tokenVersion to revoke every
  // OTHER existing session; the caller re-issues a fresh cookie so the current one survives.
  applyPasswordChange: (id, passwordHash) =>
    prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        mustChangePassword: false,
      },
    }),

  // Revoke every session for this user. requireAuth compares the token's
  // tokenVersion against the stored one on each request, so incrementing it
  // invalidates any token already issued — including a bearer token that was
  // captured before logout and would otherwise stay valid for days.
  revokeSessions: (id) =>
    prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    }),

  // --- Email change (verify-then-apply) ---
  findByPendingEmail: (pendingEmail) =>
    prisma.user.findUnique({
      where: { pendingEmail: normalizeEmail(pendingEmail) },
    }),
  findByEmailTokenHash: (emailTokenHash) =>
    prisma.user.findUnique({ where: { emailTokenHash } }),
  setEmailChangeToken: (
    id,
    pendingEmail,
    emailTokenHash,
    emailTokenExpiresAt,
  ) =>
    prisma.user.update({
      where: { id },
      data: { pendingEmail, emailTokenHash, emailTokenExpiresAt },
    }),
  // Apply a verified email change atomically: the login identity (users.email) and the
  // linked resident record must never diverge. Revokes all sessions (email is identity).
  applyEmailChange: (user) =>
    prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: user.pendingEmail,
          pendingEmail: null,
          emailTokenHash: null,
          emailTokenExpiresAt: null,
          tokenVersion: { increment: 1 },
        },
      })
      if (user.residentId) {
        await tx.resident.update({
          where: { id: user.residentId },
          data: { email: user.pendingEmail },
        })
      }
    }),
  create: (data) => prisma.user.create({ data }),
}
