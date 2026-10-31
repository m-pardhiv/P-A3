import { and, asc, eq, getTableColumns, inArray, lt, lte, sql } from 'drizzle-orm'
import type { Database, Tx } from '~/db/client'
import {
  billingRuns,
  type CustomerSnapshot,
  customers,
  discountRedemptions,
  discounts,
  invoiceLines,
  invoices,
  paymentTerms,
  plans,
  subscriptionLines,
  subscriptions,
} from '~/db/schema'
import { clock } from './clock'
import { buildInvoice, duePeriods } from './domain/billing'
import type { DiscountRule } from './domain/discounts'

export type SubscriptionOutcome = {
  subscriptionId: string
  number: string
  created: number
  skipped: number
  error?: string
}

export type BillingResult = {
  runId: string
  asOf: string
  created: number
  skipped: number
  errors: number
  activated: number
  closed: number
  subscriptions: SubscriptionOutcome[]
}

/** Thrown inside a period's savepoint to undo it when the invoice already exists. */
class AlreadyInvoiced extends Error {}

const MESSAGE_LIMIT = 300

/**
 * One billing run. Each subscription is billed in its own transaction, so a failure rolls back
 * only that subscription. Running it again for the same date creates nothing: next_invoice_date
 * has moved on, and the unique index on (subscription_id, period_start) refuses a repeat.
 */
export async function runBilling(
  database: Database,
  options: { asOf?: string; triggeredBy?: string | null } = {},
): Promise<BillingResult> {
  const asOf = options.asOf ?? clock.today()

  // A confirmed subscription whose start date has arrived becomes active and due on that date.
  const activated = await database
    .update(subscriptions)
    .set({ status: 'active', nextInvoiceDate: sql`${subscriptions.startDate}` })
    .where(and(eq(subscriptions.status, 'confirmed'), lte(subscriptions.startDate, asOf)))
    .returning({ id: subscriptions.id })

  const due = await database
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.status, 'active'), lte(subscriptions.nextInvoiceDate, asOf)))
    .orderBy(asc(subscriptions.nextInvoiceDate))

  const outcomes: SubscriptionOutcome[] = []
  for (const { id } of due) {
    try {
      const outcome = await database.transaction((tx) => billSubscription(tx, id, asOf))
      if (outcome) outcomes.push(outcome)
    } catch (error) {
      outcomes.push({
        subscriptionId: id,
        number: '',
        created: 0,
        skipped: 0,
        error: (error instanceof Error ? error.message : String(error)).slice(0, MESSAGE_LIMIT),
      })
    }
  }

  // Past its expiry date, a plan with auto_close closes the subscription. This runs after billing
  // so a final period is invoiced first. It mirrors shouldAutoClose in subscription-state.ts.
  const closed = await database
    .update(subscriptions)
    .set({ status: 'closed', nextInvoiceDate: null })
    .where(
      and(
        inArray(subscriptions.status, ['active', 'paused']),
        lt(subscriptions.expiryDate, asOf),
        inArray(
          subscriptions.planId,
          database.select({ id: plans.id }).from(plans).where(eq(plans.autoClose, true)),
        ),
      ),
    )
    .returning({ id: subscriptions.id })

  const created = outcomes.reduce((sum, o) => sum + o.created, 0)
  const skipped = outcomes.reduce((sum, o) => sum + o.skipped, 0)
  const errors = outcomes.filter((o) => o.error).length

  const [run] = await database
    .insert(billingRuns)
    .values({
      asOfDate: asOf,
      triggeredBy: options.triggeredBy ?? null,
      createdCount: created,
      skippedCount: skipped,
      errorCount: errors,
      details: { activated: activated.length, closed: closed.length, subscriptions: outcomes },
    })
    .returning({ id: billingRuns.id })

  return {
    runId: run.id,
    asOf,
    created,
    skipped,
    errors,
    activated: activated.length,
    closed: closed.length,
    subscriptions: outcomes,
  }
}

async function billSubscription(
  tx: Tx,
  id: string,
  asOf: string,
): Promise<SubscriptionOutcome | null> {
  // SKIP LOCKED: if another run holds this subscription, leave it to that run.
  const [row] = await tx
    .select({
      subscription: getTableColumns(subscriptions),
      billingPeriod: plans.billingPeriod,
      customer: getTableColumns(customers),
      termDays: paymentTerms.daysDue,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .innerJoin(paymentTerms, eq(paymentTerms.id, subscriptions.paymentTermId))
    .where(
      and(
        eq(subscriptions.id, id),
        eq(subscriptions.status, 'active'),
        lte(subscriptions.nextInvoiceDate, asOf),
      ),
    )
    .for('update', { of: subscriptions, skipLocked: true })
  if (!row) return null

  const { subscription, customer } = row
  const outcome: SubscriptionOutcome = {
    subscriptionId: id,
    number: subscription.number,
    created: 0,
    skipped: 0,
  }

  const { periods, nextStart } = duePeriods({
    startDate: subscription.startDate,
    expiryDate: subscription.expiryDate,
    nextInvoiceDate: subscription.nextInvoiceDate as string,
    billingPeriod: row.billingPeriod,
    asOf,
  })

  const lines = await tx
    .select()
    .from(subscriptionLines)
    .where(eq(subscriptionLines.subscriptionId, id))
    .orderBy(sql`${subscriptionLines.productId} is not null`, asc(subscriptionLines.description))
  const rules: DiscountRule[] = await tx.select().from(discounts).where(eq(discounts.active, true))

  const snapshot = {
    name: customer.name,
    company: customer.company,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
  }

  for (const period of periods) {
    try {
      // A savepoint per period: if the invoice already exists, its discount claims roll back too.
      const claimed = await tx.transaction((sp) =>
        createInvoice(sp, {
          subscriptionId: id,
          customerId: customer.id,
          snapshot,
          period,
          lines,
          rules,
          termDays: row.termDays,
        }),
      )
      for (const discountId of claimed) {
        const rule = rules.find((r) => r.id === discountId)
        if (rule) rule.usedCount++
      }
      outcome.created++
    } catch (error) {
      if (!(error instanceof AlreadyInvoiced)) throw error
      outcome.skipped++
    }
  }

  await tx.update(subscriptions).set({ nextInvoiceDate: nextStart }).where(eq(subscriptions.id, id))
  return outcome
}

async function createInvoice(
  sp: Tx,
  input: {
    subscriptionId: string
    customerId: string
    snapshot: CustomerSnapshot
    period: { start: string; end: string }
    lines: (typeof subscriptionLines.$inferSelect)[]
    rules: DiscountRule[]
    termDays: number
  },
) {
  const build = (excluded: Set<string>) =>
    buildInvoice({
      lines: input.lines,
      discounts: input.rules.filter((rule) => !excluded.has(rule.id)),
      issueDate: input.period.start,
      paymentTermDays: input.termDays,
    })

  // Count each discount's use atomically. If another invoice took the last use first, the claim
  // fails and the invoice is rebuilt without that discount.
  const excluded = new Set<string>()
  const claimed = new Set<string>()
  let invoice = build(excluded)
  for (;;) {
    let failed = false
    for (const line of invoice.lines) {
      if (!line.discountId || claimed.has(line.discountId)) continue
      const [won] = await sp
        .update(discounts)
        .set({ usedCount: sql`${discounts.usedCount} + 1` })
        .where(
          and(
            eq(discounts.id, line.discountId),
            sql`${discounts.usedCount} < ${discounts.usageLimit}`,
          ),
        )
        .returning({ id: discounts.id })
      if (won) claimed.add(line.discountId)
      else {
        excluded.add(line.discountId)
        failed = true
      }
    }
    if (!failed) break
    invoice = build(excluded)
  }

  // A rebuild can drop a discount that was already claimed. Give that use back.
  const kept = new Set(invoice.lines.flatMap((line) => line.discountId ?? []))
  for (const discountId of [...claimed].filter((discountId) => !kept.has(discountId))) {
    await sp
      .update(discounts)
      .set({ usedCount: sql`${discounts.usedCount} - 1` })
      .where(eq(discounts.id, discountId))
    claimed.delete(discountId)
  }

  const [inserted] = await sp
    .insert(invoices)
    .values({
      subscriptionId: input.subscriptionId,
      customerId: input.customerId,
      customerSnapshot: input.snapshot,
      periodStart: input.period.start,
      periodEnd: input.period.end,
      status: 'draft',
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      discountTotal: invoice.discountTotal,
      taxTotal: invoice.taxTotal,
      total: invoice.total,
    })
    .onConflictDoNothing({
      target: [invoices.subscriptionId, invoices.periodStart],
      // The partial unique index only covers live invoices, so the conflict target must say so.
      where: sql`${invoices.status} <> 'cancelled'`,
    })
    .returning({ id: invoices.id })
  if (!inserted) throw new AlreadyInvoiced()

  await sp.insert(invoiceLines).values(
    invoice.lines.map((line) => ({
      invoiceId: inserted.id,
      description: line.description,
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRatePercent: line.taxRatePercent,
      taxAmount: line.taxAmount,
      amount: line.amount,
    })),
  )
  if (claimed.size > 0) {
    await sp
      .insert(discountRedemptions)
      .values([...claimed].map((discountId) => ({ discountId, invoiceId: inserted.id })))
  }
  return claimed
}
