import { and, asc, count, desc, eq, ne, sql } from 'drizzle-orm'
import type { Database, Executor } from '~/db/client'
import { customers, plans, subscriptionLines, subscriptions, users } from '~/db/schema'
import type { ActionResult } from '~/shared/result'
import { PAGE_SIZE } from '~/shared/schemas/pagination'
import { totals } from './domain/subscription'
import {
  allowedActions,
  type SubscriptionAction,
  type SubscriptionStatus,
} from './domain/subscription-state'
import { taxOn } from './domain/tax'
import { loadSubscriptionContext } from './subscription-core'

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

export async function listPortalSubscriptions(
  database: Executor,
  customerId: string,
  page: number,
) {
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
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(visibleTo(customerId))
      .orderBy(desc(subscriptions.number))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    database.select({ total: count() }).from(subscriptions).where(visibleTo(customerId)),
  ])
  return { rows, total, page, pageSize: PAGE_SIZE }
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
  return {
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
