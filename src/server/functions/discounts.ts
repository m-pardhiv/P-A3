import { createServerFn } from '@tanstack/react-start'
import { count, desc, eq, getTableColumns } from 'drizzle-orm'
import { db } from '~/db/client'
import { discounts, products } from '~/db/schema'
import { clock } from '~/server/clock'
import { discountState } from '~/server/domain/discounts'
import { requireUuid } from '~/server/not-found'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { discountListSchema, discountSchema } from '~/shared/schemas/discounts'
import { idInput } from '~/shared/schemas/fields'
import { PAGE_SIZE } from '~/shared/schemas/pagination'

export const listDiscounts = createServerFn({ method: 'GET' })
  .validator(discountListSchema)
  .handler(async ({ data }) => {
    await requireRole('admin')
    const today = clock.today()
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({ ...getTableColumns(discounts), productName: products.name })
        .from(discounts)
        .leftJoin(products, eq(products.id, discounts.productId))
        .orderBy(desc(discounts.endDate), discounts.name)
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(discounts),
    ])
    return {
      rows: rows.map((row) => ({ ...row, state: discountState(row, today) })),
      total,
      page: data.page,
      pageSize: PAGE_SIZE,
    }
  })

export const saveDiscount = createServerFn({ method: 'POST' })
  .validator(discountSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin')
    const { id, ...values } = data
    if (id) {
      // The use count belongs to the invoices that used the discount, so editing never resets it.
      const [current] = await db
        .select({ usedCount: discounts.usedCount })
        .from(discounts)
        .where(eq(discounts.id, id))
      if (current && values.usageLimit < current.usedCount) {
        return {
          ok: false,
          fieldErrors: {
            usageLimit: `This discount has already been used ${current.usedCount} times`,
          },
        }
      }
      await db.update(discounts).set(values).where(eq(discounts.id, id))
    } else {
      await db.insert(discounts).values(values)
    }
    return { ok: true, data: undefined }
  })

export const deleteDiscount = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin')
    try {
      await db.delete(discounts).where(eq(discounts.id, requireUuid(data.id)))
      return { ok: true, data: undefined }
    } catch {
      return {
        ok: false,
        error: 'This discount is on an invoice already. Switch it to inactive instead.',
      }
    }
  })
