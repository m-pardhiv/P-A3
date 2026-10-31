import { createServerFn } from '@tanstack/react-start'
import { asc, count, eq, ilike } from 'drizzle-orm'
import { db } from '~/db/client'
import { plans } from '~/db/schema'
import { containsPattern, requireFound, requireUuid } from '~/server/not-found'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { planSchema } from '~/shared/schemas/catalogue'
import { idInput } from '~/shared/schemas/fields'
import { listSearchSchema, PAGE_SIZE } from '~/shared/schemas/pagination'

export const listPlans = createServerFn({ method: 'GET' })
  .validator(listSearchSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const where = data.q ? ilike(plans.name, containsPattern(data.q)) : undefined
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(plans)
        .where(where)
        .orderBy(asc(plans.price))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(plans).where(where),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })

export const getPlan = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, requireUuid(data.id)))
    return requireFound(plan)
  })

export const savePlan = createServerFn({ method: 'POST' })
  .validator(planSchema)
  .handler(async ({ data }): Promise<ActionResult<{ id: string }>> => {
    await requireRole('admin')
    const { id, ...values } = data
    if (id) {
      await db.update(plans).set(values).where(eq(plans.id, id))
      return { ok: true, data: { id } }
    }
    const [created] = await db.insert(plans).values(values).returning({ id: plans.id })
    return { ok: true, data: created }
  })
