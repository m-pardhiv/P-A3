import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import type { Database, Executor } from '~/db/client'
import {
  customers,
  invoices,
  payments,
  plans,
  subscriptionLines,
  subscriptions,
  users,
} from '~/db/schema'
import type { ActionResult } from '~/shared/result'
import { PAGE_SIZE } from '~/shared/schemas/pagination'
import { clock } from './clock'
import { totals } from './domain/subscription'
import {
  allowedActions,
  type SubscriptionAction,
  type SubscriptionStatus,
} from './domain/subscription-state'
import { taxOn } from './domain/tax'
import { listInvoices } from './invoice-queries'
import { loadSubscriptionContext } from './subscription-core'
import { listSubscriptionEvents } from './subscription-events'

/** What a customer may do themselves, and only to a subscription that is running. */
export const CUSTOMER_ACTIONS: SubscriptionAction[] = ['pause', 'resume', 'close']
export const CUSTOMER_ACTION_STATUSES: SubscriptionStatus[] = ['active', 'paused']

export async function customerForUser(database: Executor, userId: string) {
  const [customer] = await database.select().from(customers).where(eq(customers.userId, userId))
  return customer
}

/** A customer never sees a subscription that is still a draft. */
const visibleTo = (customerId: string) =>
  and(eq(subscriptions.customerId, customerId), ne(subscriptions.status, 'draft'))

const GROUP_STATUSES: Record<string, SubscriptionStatus[]> = {
  active: ['active'],
  upcoming: ['quotation', 'confirmed'],
  paused: ['paused'],
  closed: ['closed'],
}

export async function listPortalSubscriptions(
  database: Executor,
  customerId: string,
  page: number,
  group?: string,
) {
  const where = and(
    visibleTo(customerId),
    group && GROUP_STATUSES[group]
      ? inArray(subscriptions.status, GROUP_STATUSES[group])
      : undefined,
  )
  // The tab counts ignore the chosen tab, so each tab always shows its own total.
  const countRows = await database
    .select({ status: subscriptions.status, total: count() })
    .from(subscriptions)
    .where(visibleTo(customerId))
    .groupBy(subscriptions.status)
  const countOf = (statuses: SubscriptionStatus[]) =>
    countRows
      .filter((row) => statuses.includes(row.status))
      .reduce((sum, row) => sum + row.total, 0)
  const counts = {
    all: countRows.reduce((sum, row) => sum + row.total, 0),
    active: countOf(GROUP_STATUSES.active),
    upcoming: countOf(GROUP_STATUSES.upcoming),
    paused: countOf(GROUP_STATUSES.paused),
    closed: countOf(GROUP_STATUSES.closed),
  }

  const [rows, [{ total }]] = await Promise.all([
    database
      .select({
        id: subscriptions.id,
        number: subscriptions.number,
        status: subscriptions.status,
        planName: plans.name,
        billingPeriod: plans.billingPeriod,
        startDate: subscriptions.startDate,
        expiryDate: subscriptions.expiryDate,
        amount: sql<number>`(
          select coalesce(sum(${subscriptionLines.amount}), 0)::bigint from ${subscriptionLines}
          where ${subscriptionLines.subscriptionId} = ${subscriptions.id}
        )`.mapWith(Number),
        tax: sql<number>`(
          select coalesce(sum(round(${subscriptionLines.amount} * ${subscriptionLines.taxRatePercent} / 100)), 0)::bigint
          from ${subscriptionLines} where ${subscriptionLines.subscriptionId} = ${subscriptions.id}
        )`.mapWith(Number),
        // The plan's own line has no product, and its quantity is the number of seats or units.
        quantity: sql<number>`(
          select coalesce(max(${subscriptionLines.quantity}), 1)::int from ${subscriptionLines}
          where ${subscriptionLines.subscriptionId} = ${subscriptions.id}
            and ${subscriptionLines.productId} is null
        )`.mapWith(Number),
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(where)
      .orderBy(desc(subscriptions.number))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    database.select({ total: count() }).from(subscriptions).where(where),
  ])
  return { rows, total, page, pageSize: PAGE_SIZE, counts, today: clock.today() }
}

/** Undefined for someone else's subscription, a draft, or one that does not exist: all a 404. */
export async function getPortalSubscription(database: Executor, customerId: string, id: string) {
  const found = await loadSubscriptionContext(database, id)
  if (
    !found ||
    found.subscription.customerId !== customerId ||
    found.subscription.status === 'draft'
  ) {
    return undefined
  }

  const lines = await database
    .select()
    .from(subscriptionLines)
    .where(eq(subscriptionLines.subscriptionId, id))
    .orderBy(sql`${subscriptionLines.productId} is not null`, asc(subscriptionLines.description))

  const { subscription, plan } = found
  const running = CUSTOMER_ACTION_STATUSES.includes(subscription.status)
  const events = await listSubscriptionEvents(database, id)
  const invoiceRows = await listInvoices(database, { page: 1, subscriptionId: id }, { customerId })
  return {
    today: clock.today(),
    // Who on the team made a move is not for the customer.
    events: events.map(({ id: eventId, action, fromStatus, toStatus, createdAt }) => ({
      id: eventId,
      action,
      fromStatus,
      toStatus,
      createdAt,
    })),
    recentInvoices: invoiceRows.rows.slice(0, 4).map((row) => ({
      id: row.id,
      number: row.number,
      issueDate: row.issueDate,
      status: row.status,
      overdue: row.overdue,
      total: row.total,
    })),
    id: subscription.id,
    number: subscription.number,
    status: subscription.status,
    startDate: subscription.startDate,
    expiryDate: subscription.expiryDate,
    nextInvoiceDate: subscription.nextInvoiceDate,
    plan: { name: plan.name, price: plan.price, billingPeriod: plan.billingPeriod },
    lines: lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRatePercent: line.taxRatePercent,
      taxAmount: taxOn(line.amount, line.taxRatePercent),
      amount: line.amount,
    })),
    totals: totals(lines),
    actions: running
      ? allowedActions(found.context).filter((action) => CUSTOMER_ACTIONS.includes(action))
      : [],
  }
}

export type ProfileValues = {
  name: string
  company: string | null
  phone: string | null
  address: string | null
}

export async function saveProfile(
  database: Database,
  who: { userId: string; customerId: string },
  values: ProfileValues,
): Promise<ActionResult> {
  await database.transaction(async (tx) => {
    await tx.update(customers).set(values).where(eq(customers.id, who.customerId))
    // The name on the login follows the name on the customer record.
    await tx.update(users).set({ name: values.name }).where(eq(users.id, who.userId))
  })
  return { ok: true, data: undefined }
}

/** Everything the customer's home page shows, worked out in the database. */
export async function getOverview(database: Executor, customerId: string) {
  const today = clock.today()

  const [counts] = await database
    .select({
      active: sql<number>`count(*) filter (where ${subscriptions.status} = 'active')::int`,
    })
    .from(subscriptions)
    .where(visibleTo(customerId))

  const [owed] = await database
    .select({
      amount:
        sql<number>`coalesce(sum(${invoices.total} - ${invoices.amountPaid}), 0)::bigint`.mapWith(
          Number,
        ),
      invoices: sql<number>`count(*)::int`,
      overdue: sql<number>`count(*) filter (where ${invoices.dueDate} < ${today}::date)::int`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, customerId),
        eq(invoices.status, 'confirmed'),
        sql`${invoices.total} > ${invoices.amountPaid}`,
      ),
    )

  // The running subscription that is billed next, which is the one worth showing first.
  const [current] = await database
    .select({
      id: subscriptions.id,
      planName: plans.name,
      billingPeriod: plans.billingPeriod,
      startDate: subscriptions.startDate,
      expiryDate: subscriptions.expiryDate,
      nextInvoiceDate: subscriptions.nextInvoiceDate,
      amount: sql<number>`(
        select coalesce(sum(${subscriptionLines.amount}), 0)::bigint from ${subscriptionLines}
        where ${subscriptionLines.subscriptionId} = ${subscriptions.id}
      )`.mapWith(Number),
      tax: sql<number>`(
        select coalesce(sum(round(${subscriptionLines.amount} * ${subscriptionLines.taxRatePercent} / 100)), 0)::bigint
        from ${subscriptionLines} where ${subscriptionLines.subscriptionId} = ${subscriptions.id}
      )`.mapWith(Number),
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.customerId, customerId), eq(subscriptions.status, 'active')))
    .orderBy(asc(subscriptions.nextInvoiceDate), asc(subscriptions.number))
    .limit(1)

  const [lastPayment] = await database
    .select({ amount: payments.amount, paidOn: payments.paidOn })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(eq(invoices.customerId, customerId))
    .orderBy(desc(payments.paidOn), desc(payments.createdAt))
    .limit(1)

  return {
    today,
    activeSubscriptions: counts.active,
    outstanding: owed.amount,
    outstandingInvoices: owed.invoices,
    overdueInvoices: owed.overdue,
    current: current ?? null,
    lastPayment: lastPayment ?? null,
  }
}

export async function listPortalPayments(database: Executor, customerId: string, page: number) {
  const where = eq(invoices.customerId, customerId)
  const [rows, [{ total, sum }]] = await Promise.all([
    database
      .select({
        id: payments.id,
        paidOn: payments.paidOn,
        amount: payments.amount,
        method: payments.method,
        invoiceId: invoices.id,
        invoiceNumber: invoices.number,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(where)
      .orderBy(desc(payments.paidOn), desc(payments.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    database
      .select({
        total: count(),
        sum: sql<number>`coalesce(sum(${payments.amount}), 0)::bigint`.mapWith(Number),
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(where),
  ])
  return { rows, total, totalPaid: sum, page, pageSize: PAGE_SIZE }
}
