import { createServerFn } from '@tanstack/react-start'
import { asc, count, eq, ilike, or } from 'drizzle-orm'
import { db } from '~/db/client'
import { customers } from '~/db/schema'
import { containsPattern, requireFound, requireUuid } from '~/server/not-found'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { customerSchema } from '~/shared/schemas/catalogue'
import { idInput } from '~/shared/schemas/fields'
import { listSearchSchema, PAGE_SIZE } from '~/shared/schemas/pagination'

export const listCustomers = createServerFn({ method: 'GET' })
  .validator(listSearchSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const pattern = data.q ? containsPattern(data.q) : undefined
    const where = pattern
      ? or(
          ilike(customers.name, pattern),
          ilike(customers.company, pattern),
          ilike(customers.email, pattern),
        )
      : undefined
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(customers)
        .where(where)
        .orderBy(asc(customers.name))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(customers).where(where),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })

export const getCustomer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, requireUuid(data.id)))
    return requireFound(customer)
  })

export const saveCustomer = createServerFn({ method: 'POST' })
  .validator(customerSchema)
  .handler(async ({ data }): Promise<ActionResult<{ id: string }>> => {
    await requireRole('admin', 'staff')
    const { id, ...values } = data
    if (id) {
      await db.update(customers).set(values).where(eq(customers.id, id))
      return { ok: true, data: { id } }
    }
    const [created] = await db.insert(customers).values(values).returning({ id: customers.id })
    return { ok: true, data: created }
  })
