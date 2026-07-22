import { NoticeModel } from '../models/notice.model.js'
import { UserModel } from '../models/user.model.js'
import { buildCrudController } from '../utils/crudController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { pickAllowed } from '../utils/validate.js'
import { logAdminAction } from '../utils/adminLog.js'

const base = buildCrudController(NoticeModel, 'Notice')

// Matches src/lib/api/notice.ts's writable fields. postedAt/postedBy are always
// server-set below, never trusted from the client — postedBy must reflect who
// actually authenticated, and postedAt must reflect when the server received it,
// not a caller-supplied value that could misrepresent the announcement's timeline.
const FIELDS = ['title', 'category', 'body', 'pinned']

export const noticeController = {
  ...base,
  create: asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.user.sub)
    const item = await NoticeModel.create({ ...pickAllowed(req.body, FIELDS), postedBy: user.displayName })
    logAdminAction(req, 'CREATE', 'Notice', item.id)
    res.status(201).json(item)
  }),
  update: asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.user.sub)
    const item = await NoticeModel.update(req.params.id, { ...pickAllowed(req.body, FIELDS), postedBy: user.displayName })
    logAdminAction(req, 'UPDATE', 'Notice', item.id)
    res.json(item)
  }),
  remove: asyncHandler(async (req, res) => {
    await NoticeModel.remove(req.params.id)
    logAdminAction(req, 'DELETE', 'Notice', req.params.id)
    res.status(204).send()
  }),
}
