import { Router } from 'express'
import { assertKnownRoles } from '../config/roles.js'
import { requireRole } from '../middleware/auth.middleware.js'
import { validateBody } from '../middleware/validate.middleware.js'

const noop = (req, res, next) => next()

/**
 * Builds the standard list/get/create/update/delete router for a resource.
 *
 * readRoles and writeRoles are mandatory. They used to be optional, and an
 * omitted list silently produced a pass-through guard — so forgetting one
 * opened the resource to every authenticated user instead of closing it. The
 * throw below turns that failure mode into a boot-time crash. Pass ALL_ROLES
 * explicitly when open read access is the intent.
 */
export const buildCrudRouter = (
  controller,
  { readRoles, writeRoles, createSchema, updateSchema } = {},
) => {
  assertKnownRoles(readRoles, 'buildCrudRouter readRoles')
  assertKnownRoles(writeRoles, 'buildCrudRouter writeRoles')

  const router = Router()
  const read = requireRole(...readRoles)
  const write = requireRole(...writeRoles)
  const validateCreate = createSchema ? validateBody(createSchema) : noop
  const validateUpdate = updateSchema ? validateBody(updateSchema) : noop
  router.get('/', read, controller.list)
  router.get('/:id', read, controller.getOne)
  router.post('/', write, validateCreate, controller.create)
  router.put('/:id', write, validateUpdate, controller.update)
  router.delete('/:id', write, controller.remove)
  return router
}
