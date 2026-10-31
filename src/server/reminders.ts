import { and, desc, eq, sql } from 'drizzle-orm'
import type { Database, Executor } from '~/db/client'
import { paymentReminders, users } from '~/db/schema'
import { formatDate, formatMoney } from '~/lib/format'
import type { ActionResult } from '~/shared/result'
import { clock } from './clock'
import { env } from './env'
import { getInvoice } from './invoice-queries'
import { log } from './log'
import { sendMail } from './mail'

type Mailer = typeof sendMail

const MESSAGE_LIMIT = 300

/**
 * Emails the customer about an overdue invoice and records the attempt, including a failed one, so
 * the team can see who was chased and when. One delivered reminder per invoice per day keeps a
 * double click from nagging the customer.
 */
export async function sendPaymentReminder(
  database: Database,
  input: { invoiceId: string; sentBy: string },
  mail: Mailer = sendMail,
): Promise<ActionResult<{ to: string }>> {
  const found = await getInvoice(database, input.invoiceId)
  if (!found) return { ok: false, error: 'This invoice no longer exists' }
  const { invoice } = found

  const owed = invoice.total - invoice.amountPaid
  if (!invoice.overdue || owed <= 0) {
    return { ok: false, error: 'Only an overdue invoice with money still owed can be chased' }
  }

  const [today] = await database
    .select({ id: paymentReminders.id })
    .from(paymentReminders)
    .where(
      and(
        eq(paymentReminders.invoiceId, invoice.id),
        eq(paymentReminders.delivered, true),
        sql`(${paymentReminders.createdAt} at time zone 'Asia/Kolkata')::date = ${clock.today()}::date`,
      ),
    )
    .limit(1)
  if (today) return { ok: false, error: 'A reminder for this invoice was already sent today' }

  const to = invoice.customerEmail
  try {
    await mail({
      to,
      subject: `Reminder: invoice ${invoice.number} is overdue`,
      text: [
        `Hello ${invoice.customerName},`,
        '',
        `Invoice ${invoice.number} for ${invoice.subscriptionNumber} was due on ${formatDate(invoice.dueDate)}.`,
        `Amount still to pay: ${formatMoney(owed)}.`,
        '',
        `View and print it: ${env.APP_URL}/portal/invoices/${invoice.id}`,
        '',
        'If you have already paid, please ignore this message.',
      ].join('\n'),
    })
  } catch (error) {
    log.error('payment_reminder_failed', error)
    await database.insert(paymentReminders).values({
      invoiceId: invoice.id,
      sentBy: input.sentBy,
      toEmail: to,
      delivered: false,
      error: (error instanceof Error ? error.message : String(error)).slice(0, MESSAGE_LIMIT),
    })
    return {
      ok: false,
      error: 'The reminder could not be sent. Check the mail settings and retry.',
    }
  }

  await database.insert(paymentReminders).values({
    invoiceId: invoice.id,
    sentBy: input.sentBy,
    toEmail: to,
    delivered: true,
  })
  return { ok: true, data: { to } }
}

export function listReminders(reader: Executor, invoiceId: string) {
  return reader
    .select({
      id: paymentReminders.id,
      toEmail: paymentReminders.toEmail,
      delivered: paymentReminders.delivered,
      error: paymentReminders.error,
      sentByName: users.name,
      createdAt: paymentReminders.createdAt,
    })
    .from(paymentReminders)
    .leftJoin(users, eq(users.id, paymentReminders.sentBy))
    .where(eq(paymentReminders.invoiceId, invoiceId))
    .orderBy(desc(paymentReminders.createdAt))
}
