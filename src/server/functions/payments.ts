import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, gte, ilike, lte } from 'drizzle-orm'
import { db } from '~/db/client'
import { customers, invoices, payments, users } from '~/db/schema'
import { containsPattern } from '~/server/not-found'
import { requireRole } from '~/server/session'
import { paymentListSchema } from '~/shared/schemas/invoices'
import { PAGE_SIZE } from '~/shared/schemas/pagination'

export const listPayments = createServerFn({ method: 'GET' })
  .validator(paymentListSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const where = and(
      data.method ? eq(payments.method, data.method) : undefined,
      data.customerId ? eq(invoices.customerId, data.customerId) : undefined,
      data.invoice ? ilike(invoices.number, containsPattern(data.invoice)) : undefined,
      data.from ? gte(payments.paidOn, data.from) : undefined,
      data.to ? lte(payments.paidOn, data.to) : undefined,
    )

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: payments.id,
          paidOn: payments.paidOn,
          amount: payments.amount,
          method: payments.method,
          note: payments.note,
          invoiceId: invoices.id,
          invoiceNumber: invoices.number,
          customerName: customers.name,
          recordedByName: users.name,
        })
        .from(payments)
        .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
        .innerJoin(customers, eq(customers.id, invoices.customerId))
        .innerJoin(users, eq(users.id, payments.recordedBy))
        .where(where)
        .orderBy(desc(payments.paidOn), desc(payments.createdAt))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db
        .select({ total: count() })
        .from(payments)
        .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
        .where(where),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE }
  })
