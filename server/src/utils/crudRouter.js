import { Router } from 'express'
import { requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'

const noop = (req, res, next) => next()

export const buildCrudRouter = (controller, { readRoles, writeRoles, createSchema, updateSchema } = {}) => {
  const router = Router()
  const read = readRoles ? requireRole(...readRoles) : noop
  const write = writeRoles ? requireRole(...writeRoles) : noop
  const validateCreate = createSchema ? validateBody(createSchema) : noop
  const validateUpdate = updateSchema ? validateBody(updateSchema) : noop
  router.get('/', read, controller.list)
  router.get('/:id', read, controller.getOne)
  router.post('/', write, validateCreate, controller.create)
  router.put('/:id', write, validateUpdate, controller.update)
  router.delete('/:id', write, controller.remove)
  return router
}
