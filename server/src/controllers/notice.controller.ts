import type { Request, Response } from 'express'
import { z } from 'zod'
import * as NoticeModel from '../models/notice.model.js'

const noticeInputSchema = z.object({
  title: z.string().min(1),
  category: z.enum(['Important', 'Maintenance', 'Events', 'General']),
  body: z.string().min(1),
  postedBy: z.string().min(1),
  pinned: z.boolean().optional(),
})

export async function list(_req: Request, res: Response) {
  res.json(await NoticeModel.listNotices())
}

export async function create(req: Request, res: Response) {
  const input = noticeInputSchema.parse(req.body)
  res.status(201).json(await NoticeModel.createNotice(input))
}

export async function update(req: Request, res: Response) {
  const input = noticeInputSchema.partial().parse(req.body)
  res.json(await NoticeModel.updateNotice(req.params.id!, input))
}

export async function remove(req: Request, res: Response) {
  await NoticeModel.deleteNotice(req.params.id!)
  res.status(204).end()
}
