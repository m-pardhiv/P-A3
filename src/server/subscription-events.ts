import { asc, eq } from 'drizzle-orm'
import type { Executor } from '~/db/client'
import { subscriptionEvents, users } from '~/db/schema'
import type { SubscriptionStatus } from './domain/subscription-state'

export type SubscriptionEventInput = {
  subscriptionId: string
  action: string
  fromStatus: SubscriptionStatus | null
  toStatus: SubscriptionStatus
  /** Null when billing made the move. */
  actorId: string | null
}

/** Call inside the same transaction as the change, so history and state never disagree. */
export async function recordSubscriptionEvents(
  executor: Executor,
  events: SubscriptionEventInput[],
) {
  if (events.length === 0) return
  await executor.insert(subscriptionEvents).values(events)
}

export function listSubscriptionEvents(reader: Executor, subscriptionId: string) {
  return reader
    .select({
      id: subscriptionEvents.id,
      action: subscriptionEvents.action,
      fromStatus: subscriptionEvents.fromStatus,
      toStatus: subscriptionEvents.toStatus,
      actorName: users.name,
      createdAt: subscriptionEvents.createdAt,
    })
    .from(subscriptionEvents)
    .leftJoin(users, eq(users.id, subscriptionEvents.actorId))
    .where(eq(subscriptionEvents.subscriptionId, subscriptionId))
    .orderBy(asc(subscriptionEvents.createdAt), asc(subscriptionEvents.id))
}
