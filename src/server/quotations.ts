import { and, asc, eq, ne, sql } from 'drizzle-orm'
import type { Database, Executor } from '~/db/client'
import { customers, paymentTerms, plans, subscriptionLines, subscriptions } from '~/db/schema'
import { formatDate, formatMoney } from '~/lib/format'
import type { ActionResult } from '~/shared/result'
import { clock } from './clock'
import { totals } from './domain/subscription'
import { taxOn } from './domain/tax'
import { env } from './env'
import { log } from './log'
import { sendMail } from './mail'
import { recordSubscriptionEvents } from './subscription-events'

type Mailer = typeof sendMail

/**
 * A quotation is a subscription that has not started yet, so there is one record from the first
 * offer to the running subscription. Converting it is the Confirm step: nothing is copied, which
 * is also why converting twice cannot create a second subscription.
 * A customer may open their own, but never a draft.
 */
export async function getQuotation(database: Executor, id: string, scope?: { customerId: string }) {
  const [row] = await database
    .select({
      id: subscriptions.id,
      number: subscriptions.number,
      status: subscriptions.status,
      startDate: subscriptions.startDate,
      expiryDate: subscriptions.expiryDate,
      validUntil: subscriptions.quotationValidUntil,
      sentAt: subscriptions.quotationSentAt,
      customerName: customers.name,
      customerCompany: customers.company,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      planName: plans.name,
      planPrice: plans.price,
      billingPeriod: plans.billingPeriod,
      termName: paymentTerms.name,
    })
    .from(subscriptions)
    .innerJoin(customers, eq(customers.id, subscriptions.customerId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(paymentTerms, eq(paymentTerms.id, subscriptions.paymentTermId))
    .where(
      and(
        eq(subscriptions.id, id),
        scope ? eq(subscriptions.customerId, scope.customerId) : undefined,
        scope ? ne(subscriptions.status, 'draft') : undefined,
      ),
    )
  if (!row) return undefined

  const lines = await database
    .select()
    .from(subscriptionLines)
    .where(eq(subscriptionLines.subscriptionId, id))
    .orderBy(sql`${subscriptionLines.productId} is not null`, asc(subscriptionLines.description))

  return {
    quotation: { ...row, expired: row.validUntil !== null && row.validUntil < clock.today() },
    lines: lines.map((line) => ({ ...line, taxAmount: taxOn(line.amount, line.taxRatePercent) })),
    totals: totals(lines),
  }
}

/** Emails the quotation summary to the customer and records when, and by whom. */
export async function sendQuotation(
  database: Database,
  input: { id: string; actorId: string },
  mail: Mailer = sendMail,
): Promise<ActionResult<{ to: string }>> {
  const found = await getQuotation(database, input.id)
  if (!found) return { ok: false, error: 'This quotation no longer exists' }
  const { quotation, lines } = found
  if (quotation.status !== 'quotation') {
    return { ok: false, error: 'Only a quotation that has been sent for approval can be emailed' }
  }
  if (quotation.expired) {
    return { ok: false, error: 'This quotation has expired, so it cannot be sent' }
  }

  const body = [
    `Hello ${quotation.customerName},`,
    '',
    `Quotation ${quotation.number}: ${quotation.planName}`,
    `Starts ${formatDate(quotation.startDate)}${quotation.expiryDate ? `, ends ${formatDate(quotation.expiryDate)}` : ''}`,
    `Payment terms: ${quotation.termName}`,
    ...(quotation.validUntil ? [`Valid until ${formatDate(quotation.validUntil)}`] : []),
    '',
    ...lines.map((line) => `${line.description} x ${line.quantity}: ${formatMoney(line.amount)}`),
    '',
    `Subtotal: ${formatMoney(found.totals.subtotal)}`,
    `Tax: ${formatMoney(found.totals.tax)}`,
    `Total each period: ${formatMoney(found.totals.total)}`,
    '',
    `View and print it: ${env.APP_URL}/portal/subscriptions/${quotation.id}`,
  ].join('\n')

  try {
    await mail({
      to: quotation.customerEmail,
      subject: `Quotation ${quotation.number} from Brightloop`,
      text: body,
    })
  } catch (error) {
    log.error('quotation_email_failed', error)
    return { ok: false, error: 'The email could not be sent. Check the mail settings and retry.' }
  }

  await database.transaction(async (tx) => {
    await tx
      .update(subscriptions)
      .set({ quotationSentAt: clock.now() })
      .where(eq(subscriptions.id, input.id))
    await recordSubscriptionEvents(tx, [
      {
        subscriptionId: input.id,
        action: 'quotation_emailed',
        fromStatus: 'quotation',
        toStatus: 'quotation',
        actorId: input.actorId,
      },
    ])
  })
  return { ok: true, data: { to: quotation.customerEmail } }
}
