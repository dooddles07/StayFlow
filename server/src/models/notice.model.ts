import { prisma } from '../lib/prisma.js'

export function listNotices() {
  return prisma.notice.findMany({ orderBy: [{ pinned: 'desc' }, { postedAt: 'desc' }] })
}

export interface NoticeInput {
  title: string
  category: string
  body: string
  postedBy: string
  pinned?: boolean
}

export function createNotice(input: NoticeInput) {
  return prisma.notice.create({ data: { ...input, pinned: input.pinned ?? false } })
}

export function updateNotice(id: string, input: Partial<NoticeInput>) {
  return prisma.notice.update({ where: { id }, data: input })
}

export function deleteNotice(id: string) {
  return prisma.notice.delete({ where: { id } })
}
