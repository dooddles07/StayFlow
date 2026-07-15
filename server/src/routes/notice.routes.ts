import { Router } from 'express'
import * as NoticeController from '../controllers/notice.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

export const noticeRouter = Router()

noticeRouter.use(requireAuth)
noticeRouter.get('/', asyncHandler(NoticeController.list))
noticeRouter.post('/', requireRole('MANAGEMENT'), asyncHandler(NoticeController.create))
noticeRouter.patch('/:id', requireRole('MANAGEMENT'), asyncHandler(NoticeController.update))
noticeRouter.delete('/:id', requireRole('MANAGEMENT'), asyncHandler(NoticeController.remove))
