import { createServerFn } from '@tanstack/react-start'
import { asc, count, eq, ilike, or } from 'drizzle-orm'
import { db } from '~/db/client'
import { isUniqueViolation } from '~/db/errors'
import { products, productVariants } from '~/db/schema'
import { containsPattern, requireFound, requireUuid } from '~/server/not-found'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { productSchema, variantSchema } from '~/shared/schemas/catalogue'
import { idInput } from '~/shared/schemas/fields'
import { listSearchSchema, PAGE_SIZE } from '~/shared/schemas/pagination'

export const listProducts = createServerFn({ method: 'GET' })
  .validator(listSearchSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const pattern = data.q ? containsPattern(data.q) : undefined
    const where = pattern
      ? or(ilike(products.name, pattern), ilike(products.type, pattern))
      : undefined
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(products)
        .where(where)
        .orderBy(asc(products.name))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(products).where(where),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })

export const getProduct = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const id = requireUuid(data.id)
    const [product] = await db.select().from(products).where(eq(products.id, id))
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.attribute), asc(productVariants.value))
    return { product: requireFound(product), variants }
  })

export const saveProduct = createServerFn({ method: 'POST' })
  .validator(productSchema)
  .handler(async ({ data }): Promise<ActionResult<{ id: string }>> => {
    await requireRole('admin')
    const { id, ...values } = data
    if (id) {
      await db.update(products).set(values).where(eq(products.id, id))
      return { ok: true, data: { id } }
    }
    const [created] = await db.insert(products).values(values).returning({ id: products.id })
    return { ok: true, data: created }
  })

export const addVariant = createServerFn({ method: 'POST' })
  .validator(variantSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin')
    try {
      await db.insert(productVariants).values(data)
      return { ok: true, data: undefined }
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, fieldErrors: { value: 'This product already has that variant' } }
      }
      throw error
    }
  })

export const deleteVariant = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin')
    try {
      await db.delete(productVariants).where(eq(productVariants.id, requireUuid(data.id)))
      return { ok: true, data: undefined }
    } catch {
      return { ok: false, error: 'This variant is used on a subscription or template' }
    }
  })
