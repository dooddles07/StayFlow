import { z } from 'zod'
import { nonEmptyString } from './shared.js'

export const loginSchema = z.object({ email: nonEmptyString, password: nonEmptyString })
export const forgotPasswordSchema = z.object({ email: nonEmptyString })
export const resetPasswordSchema = z.object({ token: nonEmptyString, password: nonEmptyString })
export const requestEmailChangeSchema = z.object({ newEmail: nonEmptyString, currentPassword: nonEmptyString })
export const confirmEmailChangeSchema = z.object({ token: nonEmptyString })
export const changePasswordSchema = z.object({ currentPassword: nonEmptyString, newPassword: nonEmptyString })
