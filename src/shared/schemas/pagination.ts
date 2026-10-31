import { z } from 'zod'

export const PAGE_SIZE = 20

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
})

export const listSearchSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional().catch(undefined),
})

export type Page<T> = { rows: T[]; total: number; page: number; pageSize: number }
