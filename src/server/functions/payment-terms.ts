import { createServerFn } from '@tanstack/react-start'
import { asc, count, eq } from 'drizzle-orm'
import { db } from '~/db/client'
import { isUniqueViolation } from '~/db/errors'
import { paymentTerms } from '~/db/schema'
import { requireUuid } from '~/server/not-found'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { paymentTermSchema } from '~/shared/schemas/catalogue'
import { idInput } from '~/shared/schemas/fields'
import { PAGE_SIZE, paginationSchema } from '~/shared/schemas/pagination'

export const listPaymentTerms = createServerFn({ method: 'GET' })
  .validator(paginationSchema)
  .handler(async ({ data }) => {
    await requireRole('admin')
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(paymentTerms)
        .orderBy(asc(paymentTerms.daysDue))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(paymentTerms),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })

export const savePaymentTerm = createServerFn({ method: 'POST' })
  .validator(paymentTermSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin')
    const { id, ...values } = data
    try {
      if (id) await db.update(paymentTerms).set(values).where(eq(paymentTerms.id, id))
      else await db.insert(paymentTerms).values(values)
      return { ok: true, data: undefined }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, fieldErrors: { name: 'Payment terms with this name already exist' } }
      }
      throw error
    }
  })

export const deletePaymentTerm = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin')
    try {
      await db.delete(paymentTerms).where(eq(paymentTerms.id, requireUuid(data.id)))
      return { ok: true, data: undefined }
    } catch {
      return { ok: false, error: 'These payment terms are used by a subscription or template' }
    }
  })
