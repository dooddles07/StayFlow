import type { Request, Response } from 'express'
import { z } from 'zod'
import { findUserByEmail, findUserById } from '../models/user.model.js'
import { comparePassword, signToken } from '../services/auth.service.js'
import { ApiError } from '../utils/ApiError.js'
import { toResidentDTO } from '../models/resident.model.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function serializeUser(user: NonNullable<Awaited<ReturnType<typeof findUserByEmail>>>) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    residentId: user.residentId,
    staffId: user.staffId,
    resident: user.resident ? toResidentDTO(user.resident) : null,
    staff: user.staff,
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body)

  const user = await findUserByEmail(email)
  if (!user) throw ApiError.unauthorized('Invalid email or password')

  const valid = await comparePassword(password, user.passwordHash)
  if (!valid) throw ApiError.unauthorized('Invalid email or password')

  const token = signToken({ userId: user.id, role: user.role, residentId: user.residentId, staffId: user.staffId })

  res.json({ token, user: serializeUser(user) })
}

export async function me(req: Request, res: Response) {
  const auth = req.auth!
  const user = await findUserById(auth.userId)
  if (!user) throw ApiError.notFound('User not found')
  res.json({ user: serializeUser(user) })
}
