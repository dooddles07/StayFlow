import { api } from './client'
import type { DiningTable } from '#/lib/mock/types'

// Read is open to any authenticated role — used for the staff table map.
export const getAllTables = () => api.get<DiningTable[]>('/tables')
