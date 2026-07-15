import { Router } from 'express'
import { login, me } from '../controllers/auth.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(login))
authRouter.get('/me', requireAuth, asyncHandler(me))
