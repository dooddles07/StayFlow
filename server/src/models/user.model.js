import { prisma } from '../config/db.js'

export const UserModel = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email }, include: { resident: true, staff: true } }),
  findById: (id) => prisma.user.findUnique({ where: { id }, include: { resident: true, staff: true } }),
  findAuthState: (id) => prisma.user.findUnique({ where: { id }, select: { id: true, tokenVersion: true, isActive: true } }),
  setLoginState: (id, data) => prisma.user.update({ where: { id }, data }),
  setResetToken: (id, resetTokenHash, resetTokenExpiresAt) =>
    prisma.user.update({ where: { id }, data: { resetTokenHash, resetTokenExpiresAt } }),
  findByResetTokenHash: (resetTokenHash) => prisma.user.findUnique({ where: { resetTokenHash } }),
  // Consume a reset: set new password, clear reset fields, revoke all existing sessions, clear any lock.
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
      },
    }),
  create: (data) => prisma.user.create({ data }),
}
