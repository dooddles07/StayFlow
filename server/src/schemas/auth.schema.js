import { z } from 'zod'
import { nonEmptyString } from './shared.js'

// Sign-in identity is case-insensitive and stored lowercase, so normalise at the
// edge. Without this, a user who changed their email (that flow lowercases the
// new address) could not sign in by typing it with a capital letter.
// Length cap keeps an oversized string out of the bcrypt/db path.
const emailAddress = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email('Enter a valid email address')

export const loginSchema = z.object({
  email: emailAddress,
  password: nonEmptyString,
})
export const forgotPasswordSchema = z.object({ email: emailAddress })
export const resetPasswordSchema = z.object({
  token: nonEmptyString,
  password: nonEmptyString,
})
export const requestEmailChangeSchema = z.object({
  newEmail: emailAddress,
  currentPassword: nonEmptyString,
})
export const confirmEmailChangeSchema = z.object({ token: nonEmptyString })
export const changePasswordSchema = z.object({
  currentPassword: nonEmptyString,
  newPassword: nonEmptyString,
})
