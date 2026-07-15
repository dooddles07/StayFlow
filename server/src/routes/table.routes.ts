import { Router } from 'express'
import * as TableController from '../controllers/table.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.middleware.js'

export const tableRouter = Router()

tableRouter.use(requireAuth)
tableRouter.get('/', asyncHandler(TableController.list))
