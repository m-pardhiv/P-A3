import { z } from 'zod'

export const PAGE_SIZE = 20

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
})

export type Page<T> = { rows: T[]; total: number; page: number; pageSize: number }
