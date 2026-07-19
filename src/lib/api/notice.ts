import { api, cachedGet, invalidateCache } from './client'
import type { Notice, NoticeCategory } from '#/lib/mock/types'

// Server returns notices sorted (pinned desc, postedAt desc); postedAt is an ISO string.
export const getNotices = () => cachedGet<Notice[]>('/notices')

export interface NoticeInput {
  title: string
  category: NoticeCategory
  body: string
  pinned: boolean
}

// Writes require STAFF/MANAGEMENT (enforced server-side). postedAt/id/postedBy are set by the server.
const bust = () => invalidateCache('/notices')
export const createNotice = (data: NoticeInput) => api.post<Notice>('/notices', data).finally(bust)
export const updateNotice = (id: string, data: NoticeInput) => api.put<Notice>(`/notices/${id}`, data).finally(bust)
export const deleteNotice = (id: string) => api.del<void>(`/notices/${id}`).finally(bust)
