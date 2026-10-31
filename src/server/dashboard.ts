import { and, between, count, desc, eq, gt, lt, type SQL, sql } from 'drizzle-orm'
import type { Executor } from '~/db/client'
import {
  customers,
  invoices,
  paymentReminders,
  payments,
  plans,
  subscriptionLines,
  subscriptions,
} from '~/db/schema'
import type { DashboardFilters } from '~/shared/schemas/dashboard'
import { PAGE_SIZE } from '~/shared/schemas/pagination'
import { clock } from './clock'
import { addDays } from './domain/dates'

export type ResolvedFilters = DashboardFilters & {
  from: string
  to: string
  today: string
  /** True when the user picked a date range, rather than getting the default one. */
  rangeSet: boolean
}

/** The date range defaults to the last 30 days. It narrows revenue and payments only. */
export function resolveFilters(filters: DashboardFilters): ResolvedFilters {
  const today = clock.today()
  const to = filters.to ?? today
  const from = filters.from ?? addDays(to, -30)
  return {
    ...filters,
    from: from <= to ? from : to,
    to,
    today,
    rangeSet: Boolean(filters.from || filters.to),
  }
}

// Plan and customer narrow every number on the page. Each SQL fragment names its own tables.
const byPlan = (f: ResolvedFilters) => (f.planId ? sql`and s.plan_id = ${f.planId}` : sql``)
const bySubscriptionCustomer = (f: ResolvedFilters) =>
  f.customerId ? sql`and s.customer_id = ${f.customerId}` : sql``
const byInvoiceCustomer = (f: ResolvedFilters) =>
  f.customerId ? sql`and i.customer_id = ${f.customerId}` : sql``

/** Active subscriptions, and monthly recurring revenue normalised to one month. */
export function activeAndMrrSql(f: ResolvedFilters) {
  // daily x 30, weekly x 52/12, monthly as is, yearly / 12. numeric avoids float drift.
  return sql`
    select
      count(*)::int as active_subscriptions,
      coalesce(round(sum(
        t.total * case p.billing_period
          when 'daily' then 30::numeric
          when 'weekly' then 52::numeric / 12
          when 'monthly' then 1::numeric
          else 1::numeric / 12
        end
      )), 0)::bigint as mrr
    from subscriptions s
    join plans p on p.id = s.plan_id
    join lateral (
      select coalesce(sum(l.amount), 0) as total
      from subscription_lines l
      where l.subscription_id = s.id
    ) t on true
    where s.status = 'active' ${byPlan(f)} ${bySubscriptionCustomer(f)}`
}

export function revenueSql(f: ResolvedFilters) {
  return sql`
    select coalesce(sum(pay.amount), 0)::bigint as revenue
    from payments pay
    join invoices i on i.id = pay.invoice_id
    join subscriptions s on s.id = i.subscription_id
    where pay.paid_on between ${f.from}::date and ${f.to}::date
      ${byPlan(f)} ${byInvoiceCustomer(f)}`
}

/** What is owed on confirmed invoices, what is overdue, and how old the overdue amounts are. */
export function owedSql(f: ResolvedFilters) {
  const owed = sql`(i.total - i.amount_paid)`
  const days = sql`(${f.today}::date - i.due_date)`
  return sql`
    select
      coalesce(sum(${owed}), 0)::bigint as outstanding,
      count(*) filter (where i.due_date < ${f.today}::date)::int as overdue_count,
      coalesce(sum(${owed}) filter (where i.due_date < ${f.today}::date), 0)::bigint as overdue_amount,
      count(*) filter (where ${days} between 1 and 30)::int as bucket1_count,
      coalesce(sum(${owed}) filter (where ${days} between 1 and 30), 0)::bigint as bucket1_amount,
      count(*) filter (where ${days} between 31 and 60)::int as bucket2_count,
      coalesce(sum(${owed}) filter (where ${days} between 31 and 60), 0)::bigint as bucket2_amount,
      count(*) filter (where ${days} > 60)::int as bucket3_count,
      coalesce(sum(${owed}) filter (where ${days} > 60), 0)::bigint as bucket3_amount
    from invoices i
    join subscriptions s on s.id = i.subscription_id
    where i.status = 'confirmed' and i.total > i.amount_paid
      ${byPlan(f)} ${byInvoiceCustomer(f)}`
}

type Row = Record<string, number | string>

export async function getSummary(database: Executor, filters: DashboardFilters) {
  const f = resolveFilters(filters)
  const [[active], [revenue], [owed]] = await Promise.all([
    database.execute<Row>(activeAndMrrSql(f)),
    database.execute<Row>(revenueSql(f)),
    database.execute<Row>(owedSql(f)),
  ])
  const n = (value: number | string) => Number(value)

  return {
    from: f.from,
    to: f.to,
    today: f.today,
    activeSubscriptions: n(active.active_subscriptions),
    mrr: n(active.mrr),
    revenue: n(revenue.revenue),
    outstanding: n(owed.outstanding),
    overdueCount: n(owed.overdue_count),
    overdueAmount: n(owed.overdue_amount),
    ageing: [
      { label: '1 to 30 days', count: n(owed.bucket1_count), amount: n(owed.bucket1_amount) },
      { label: '31 to 60 days', count: n(owed.bucket2_count), amount: n(owed.bucket2_amount) },
      { label: '61 days or more', count: n(owed.bucket3_count), amount: n(owed.bucket3_amount) },
    ],
  }
}

const offset = (page: number) => (page - 1) * PAGE_SIZE

export function paymentsWhere(f: ResolvedFilters) {
  return and(
    between(payments.paidOn, f.from, f.to),
    f.planId ? eq(subscriptions.planId, f.planId) : undefined,
    f.customerId ? eq(invoices.customerId, f.customerId) : undefined,
  )
}

export const paymentsQuery = (database: Executor, f: ResolvedFilters, page: number) =>
  database
    .select({
      id: payments.id,
      paidOn: payments.paidOn,
      amount: payments.amount,
      method: payments.method,
      invoiceId: invoices.id,
      invoiceNumber: invoices.number,
      customerName: customers.name,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(paymentsWhere(f))
    .orderBy(desc(payments.paidOn), desc(payments.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset(page))

export const paymentsCountQuery = (database: Executor, f: ResolvedFilters) =>
  database
    .select({ total: count() })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
    .where(paymentsWhere(f))

export function overdueWhere(f: ResolvedFilters) {
  return and(
    eq(invoices.status, 'confirmed'),
    gt(invoices.total, invoices.amountPaid),
    lt(invoices.dueDate, f.today),
    f.planId ? eq(subscriptions.planId, f.planId) : undefined,
    f.customerId ? eq(invoices.customerId, f.customerId) : undefined,
  )
}

export const overdueQuery = (database: Executor, f: ResolvedFilters, page: number) =>
  database
    .select({
      id: invoices.id,
      number: invoices.number,
      dueDate: invoices.dueDate,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      customerName: customers.name,
      daysOverdue: sql<number>`(${f.today}::date - ${invoices.dueDate})`.mapWith(Number),
      reminders: sql<number>`(
        select count(*)::int from ${paymentReminders}
        where ${paymentReminders.invoiceId} = ${invoices.id} and ${paymentReminders.delivered}
      )`.mapWith(Number),
    })
    .from(invoices)
    .innerJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(overdueWhere(f))
    // The oldest debt first.
    .orderBy(invoices.dueDate, invoices.number)
    .limit(PAGE_SIZE)
    .offset(offset(page))

export const overdueCountQuery = (database: Executor, f: ResolvedFilters) =>
  database
    .select({ total: count() })
    .from(invoices)
    .innerJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
    .where(overdueWhere(f))

export function subscriptionsWhere(f: ResolvedFilters): SQL | undefined {
  return and(
    f.status ? eq(subscriptions.status, f.status) : undefined,
    f.planId ? eq(subscriptions.planId, f.planId) : undefined,
    f.customerId ? eq(subscriptions.customerId, f.customerId) : undefined,
  )
}

export const subscriptionsQuery = (database: Executor, f: ResolvedFilters, page: number) =>
  database
    .select({
      id: subscriptions.id,
      number: subscriptions.number,
      status: subscriptions.status,
      customerName: customers.name,
      planName: plans.name,
      nextInvoiceDate: subscriptions.nextInvoiceDate,
      amount: sql<number>`(
        select coalesce(sum(${subscriptionLines.amount}), 0)::bigint from ${subscriptionLines}
        where ${subscriptionLines.subscriptionId} = ${subscriptions.id}
      )`.mapWith(Number),
    })
    .from(subscriptions)
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(subscriptionsWhere(f))
    .orderBy(desc(subscriptions.number))
    .limit(PAGE_SIZE)
    .offset(offset(page))

export const subscriptionsCountQuery = (database: Executor, f: ResolvedFilters) =>
  database.select({ total: count() }).from(subscriptions).where(subscriptionsWhere(f))

export async function getPaymentsTable(
  database: Executor,
  filters: DashboardFilters,
  page: number,
) {
  const f = resolveFilters(filters)
  const [rows, [{ total }]] = await Promise.all([
    paymentsQuery(database, f, page),
    paymentsCountQuery(database, f),
  ])
  return { rows, total, page, pageSize: PAGE_SIZE }
}

export async function getOverdueTable(database: Executor, filters: DashboardFilters, page: number) {
  const f = resolveFilters(filters)
  const [rows, [{ total }]] = await Promise.all([
    overdueQuery(database, f, page),
    overdueCountQuery(database, f),
  ])
  return { rows, total, page, pageSize: PAGE_SIZE }
}

export async function getSubscriptionsTable(
  database: Executor,
  filters: DashboardFilters,
  page: number,
) {
  const f = resolveFilters(filters)
  const [rows, [{ total }]] = await Promise.all([
    subscriptionsQuery(database, f, page),
    subscriptionsCountQuery(database, f),
  ])
  return { rows, total, page, pageSize: PAGE_SIZE }
}

/** Invoices by stored status or overdue. The date range applies to the issue date, when one is set. */
export function invoicesWhere(f: ResolvedFilters) {
  return and(
    f.planId ? eq(subscriptions.planId, f.planId) : undefined,
    f.customerId ? eq(invoices.customerId, f.customerId) : undefined,
    f.rangeSet ? between(invoices.issueDate, f.from, f.to) : undefined,
    f.invoiceStatus === 'overdue'
      ? and(
          eq(invoices.status, 'confirmed'),
          gt(invoices.total, invoices.amountPaid),
          lt(invoices.dueDate, f.today),
        )
      : f.invoiceStatus
        ? eq(invoices.status, f.invoiceStatus)
        : undefined,
  )
}

export const invoicesQuery = (database: Executor, f: ResolvedFilters, page: number) =>
  database
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      customerName: customers.name,
      overdue: sql<boolean>`(${invoices.status} = 'confirmed' and ${invoices.total} - ${invoices.amountPaid} > 0 and ${invoices.dueDate} < ${f.today}::date)`,
    })
    .from(invoices)
    .innerJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(invoicesWhere(f))
    .orderBy(desc(invoices.issueDate), desc(invoices.number))
    .limit(PAGE_SIZE)
    .offset(offset(page))

export const invoicesCountQuery = (database: Executor, f: ResolvedFilters) =>
  database
    .select({ total: count() })
    .from(invoices)
    .innerJoin(subscriptions, eq(subscriptions.id, invoices.subscriptionId))
    .where(invoicesWhere(f))

export async function getInvoicesTable(
  database: Executor,
  filters: DashboardFilters,
  page: number,
) {
  const f = resolveFilters(filters)
  const [rows, [{ total }]] = await Promise.all([
    invoicesQuery(database, f, page),
    invoicesCountQuery(database, f),
  ])
  return { rows, total, page, pageSize: PAGE_SIZE }
}
