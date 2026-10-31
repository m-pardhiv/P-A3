import { createServerFn } from '@tanstack/react-start'
import { asc, count, eq, getTableColumns } from 'drizzle-orm'
import { db } from '~/db/client'
import { products, taxRules } from '~/db/schema'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { taxRuleSchema } from '~/shared/schemas/catalogue'
import { PAGE_SIZE, paginationSchema } from '~/shared/schemas/pagination'

export const listTaxRules = createServerFn({ method: 'GET' })
  .validator(paginationSchema)
  .handler(async ({ data }) => {
    await requireRole('admin')
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ ...getTableColumns(taxRules), productName: products.name })
        .from(taxRules)
        .leftJoin(products, eq(products.id, taxRules.productId))
        .orderBy(asc(taxRules.name))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(taxRules),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })

export const saveTaxRule = createServerFn({ method: 'POST' })
  .validator(taxRuleSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin')
    const { id, ...values } = data
    await db.transaction(async (tx) => {
      // Only one active rule may be the default, so the old one steps down first.
      if (values.isDefault) {
        await tx.update(taxRules).set({ isDefault: false }).where(eq(taxRules.isDefault, true))
      }
      if (id) await tx.update(taxRules).set(values).where(eq(taxRules.id, id))
      else await tx.insert(taxRules).values(values)
    })
    return { ok: true, data: undefined }
  })
