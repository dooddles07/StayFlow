import { NoticeModel } from '../models/notice.model.js'
import { UserModel } from '../models/user.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(NoticeModel, 'Notice')

// postedBy must reflect who actually authenticated, not whatever the client sends —
// otherwise any STAFF/MANAGEMENT caller could post under someone else's name.
export const noticeController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.user.sub)
    const item = await NoticeModel.create({ ...req.body, postedBy: user.displayName })
    logAdminAction(req, 'CREATE', 'Notice', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.user.sub)
    const item = await NoticeModel.update(req.params.id, { ...req.body, postedBy: user.displayName })
    logAdminAction(req, 'UPDATE', 'Notice', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await NoticeModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Notice', req.params.id)
    res.status(204).send()
  }),
}
