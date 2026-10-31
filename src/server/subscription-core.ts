import { eq, getTableColumns } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Database, Executor } from '~/db/client'
import { plans, subscriptionLines, subscriptions } from '~/db/schema'
import type { ActionResult } from '~/shared/result'
import { clock } from './clock'
import { renewalDates } from './domain/subscription'
import {
  type SubscriptionAction,
  type SubscriptionContext,
  type SubscriptionStatus,
  transition,
} from './domain/subscription-state'

/** Stops two people changing the same subscription at once. Call inside a transaction. */
export const lockSubscription = (tx: Executor, id: string) =>
  tx
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .for('update')

export async function loadSubscriptionContext(reader: Executor, id: string) {
  const renewal = alias(subscriptions, 'renewal')
  const [row] = await reader
    .select({
      subscription: getTableColumns(subscriptions),
      plan: getTableColumns(plans),
      renewalId: renewal.id,
      renewalNumber: renewal.number,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .leftJoin(renewal, eq(renewal.renewedFromId, subscriptions.id))
    .where(eq(subscriptions.id, id))
  if (!row) return null

  const context: SubscriptionContext = {
    status: row.subscription.status,
    startDate: row.subscription.startDate,
    expiryDate: row.subscription.expiryDate,
    quotationValidUntil: row.subscription.quotationValidUntil,
    alreadyRenewed: row.renewalId !== null,
    plan: row.plan,
    today: clock.today(),
  }
  return { ...row, context }
}

/**
 * Moves a subscription through the state machine. Staff and the customer portal both come here, so
 * there is one set of rules. The portal passes its customer id and the few actions a customer may
 * take; anything else, or someone else's subscription, is refused.
 */
export async function performSubscriptionAction(
  database: Database,
  input: {
    id: string
    action: SubscriptionAction
    actorId: string
    customerId?: string
    allowed?: SubscriptionAction[]
    /** The portal only lets a customer act on a subscription that is running. */
    statuses?: SubscriptionStatus[]
  },
): Promise<ActionResult<{ id: string }>> {
  return database.transaction(async (tx): Promise<ActionResult<{ id: string }>> => {
    await lockSubscription(tx, input.id)
    const found = await loadSubscriptionContext(tx, input.id)
    if (!found || (input.customerId && found.subscription.customerId !== input.customerId)) {
      return { ok: false, error: 'This subscription no longer exists' }
    }
    const outOfReach = input.statuses && !input.statuses.includes(found.subscription.status)
    if (outOfReach || (input.allowed && !input.allowed.includes(input.action))) {
      return { ok: false, error: 'You cannot do that to this subscription' }
    }

    const result = transition(found.context, input.action)
    if (!result.ok) return result

    if (input.action === 'renew') {
      const { id: _id, number: _number, createdAt: _createdAt, ...source } = found.subscription
      const [renewal] = await tx
        .insert(subscriptions)
        .values({
          ...source,
          ...renewalDates({
            startDate: source.startDate,
            expiryDate: source.expiryDate as string,
          }),
          status: 'draft',
          nextInvoiceDate: null,
          quotationValidUntil: null,
          renewedFromId: found.subscription.id,
          createdBy: input.actorId,
        })
        .returning({ id: subscriptions.id })
      const lines = await tx
        .select()
        .from(subscriptionLines)
        .where(eq(subscriptionLines.subscriptionId, input.id))
      await tx
        .insert(subscriptionLines)
        .values(lines.map(({ id: _lineId, ...line }) => ({ ...line, subscriptionId: renewal.id })))
      return { ok: true, data: { id: renewal.id } }
    }

    await tx
      .update(subscriptions)
      .set({
        status: result.status,
        ...(input.action === 'activate' ? { nextInvoiceDate: found.subscription.startDate } : {}),
        ...(input.action === 'close' ? { nextInvoiceDate: null } : {}),
      })
      .where(eq(subscriptions.id, input.id))
    return { ok: true, data: { id: input.id } }
  })
}
