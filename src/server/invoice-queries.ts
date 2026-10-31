import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  lte,
  sql,
} from 'drizzle-orm'
import type { Executor } from '~/db/client'
import { customers, invoiceLines, invoices, payments, subscriptions, users } from '~/db/schema'
import { PAGE_SIZE } from '~/shared/schemas/pagination'
import { clock } from './clock'
import { containsPattern } from './not-found'

/** Overdue is derived, never stored: confirmed, still owed, and past its due date. */
export const overdueSql = (today: string) =>
  sql<boolean>`(${invoices.status} = 'confirmed' and ${invoices.total} - ${invoices.amountPaid} > 0 and ${invoices.dueDate} < ${today})`

/** A customer sees only their own issued invoices: never drafts or cancelled ones. */
type Scope = { customerId: string }
const CUSTOMER_VISIBLE = ['confirmed', 'paid'] as const

export type InvoiceFilters = {
  page: number
  q?: string
  status?: 'draft' | 'confirmed' | 'paid' | 'cancelled'
  customerId?: string
  subscriptionId?: string
  from?: string
  to?: string
  overdue?: boolean
}

export async function listInvoices(database: Executor, filters: InvoiceFilters, scope?: Scope) {
  const today = clock.today()
  const where = and(
    scope ? eq(invoices.customerId, scope.customerId) : undefined,
    scope ? inArray(invoices.status, [...CUSTOMER_VISIBLE]) : undefined,
    filters.q ? ilike(invoices.number, containsPattern(filters.q)) : undefined,
    filters.status ? eq(invoices.status, filters.status) : undefined,
    filters.customerId ? eq(invoices.customerId, filters.customerId) : undefined,
    filters.subscriptionId ? eq(invoices.subscriptionId, filters.subscriptionId) : undefined,
    filters.from ? gte(invoices.issueDate, filters.from) : undefined,
    filters.to ? lte(invoices.issueDate, filters.to) : undefined,
    filters.overdue ? overdueSql(today) : undefined,
  )

  const [rows, [{ total }]] = await Promise.all([
    database
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        periodStart: invoices.periodStart,
        periodEnd: invoices.periodEnd,
        total: invoices.total,
        amountPaid: invoices.amountPaid,
        customerName: customers.name,
        subscriptionId: invoices.subscriptionId,
        subscriptionNumber: subscriptions.number,
        overdue: overdueSql(today),
      })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .innerJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
      .where(where)
      .orderBy(desc(invoices.issueDate), desc(invoices.number))
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
    database.select({ total: count() }).from(invoices).where(where),
  ])
  return { rows, total, page: filters.page, pageSize: PAGE_SIZE }
}

/** Returns undefined for a missing invoice and for one the scope may not see, so both are a 404. */
export async function getInvoice(database: Executor, id: string, scope?: Scope) {
  const today = clock.today()
  const [invoice] = await database
    .select({
      ...getTableColumns(invoices),
      customerName: customers.name,
      customerCompany: customers.company,
      customerEmail: customers.email,
      subscriptionNumber: subscriptions.number,
      overdue: overdueSql(today),
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .innerJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
    .where(
      and(
        eq(invoices.id, id),
        scope ? eq(invoices.customerId, scope.customerId) : undefined,
        scope ? inArray(invoices.status, [...CUSTOMER_VISIBLE]) : undefined,
      ),
    )
  if (!invoice) return undefined

  const [lines, paymentRows] = await Promise.all([
    database
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, id))
      // Discount lines have no product and sit below the products they reduce.
      .orderBy(
        sql`${invoiceLines.amount} < 0`,
        sql`${invoiceLines.productId} is not null desc`,
        asc(invoiceLines.description),
      ),
    database
      .select({ ...getTableColumns(payments), recordedByName: users.name })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.recordedBy))
      .where(eq(payments.invoiceId, id))
      .orderBy(desc(payments.paidOn), desc(payments.createdAt)),
  ])
  return { invoice, lines, payments: paymentRows }
}
