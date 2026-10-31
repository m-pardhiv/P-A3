import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '~/db/client'
import { customers, invoices } from '~/db/schema'
import { formatMoney } from '~/lib/format'
import { clock } from '~/server/clock'
import {
  allowedInvoiceActions,
  canSendInvoice,
  invoiceTransition,
} from '~/server/domain/invoice-state'
import { env } from '~/server/env'
import { getInvoice, listInvoices } from '~/server/invoice-queries'
import { log } from '~/server/log'
import { sendMail } from '~/server/mail'
import { requireFound, requireUuid } from '~/server/not-found'
import { recordPayment } from '~/server/payments'
import { listReminders, sendPaymentReminder } from '~/server/reminders'
import { getSessionUser, requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { idInput } from '~/shared/schemas/fields'
import {
  invoiceActionSchema,
  invoiceListSchema,
  recordPaymentSchema,
  sendInvoiceSchema,
} from '~/shared/schemas/invoices'

export const listInvoicesFn = createServerFn({ method: 'GET' })
  .validator(invoiceListSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    return listInvoices(db, data)
  })

export const getInvoiceFn = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const found = requireFound(await getInvoice(db, requireUuid(data.id)))
    return {
      ...found,
      reminders: await listReminders(db, found.invoice.id),
      canRemind: found.invoice.overdue,
      actions: allowedInvoiceActions(found.invoice),
      canSend: canSendInvoice(found.invoice.status),
      canPay: found.invoice.status === 'confirmed',
      today: clock.today(),
    }
  })

/** The print page is shared: staff may print any invoice, a customer only their own. */
export const getInvoiceDocument = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    const user = await getSessionUser()
    if (!user) throw notFound()
    const id = requireUuid(data.id)

    let scope: { customerId: string } | undefined
    if (user.role === 'customer') {
      const [own] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.userId, user.id))
      scope = { customerId: requireFound(own).id }
    }
    return requireFound(await getInvoice(db, id, scope))
  })

export const confirmAllDrafts = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ActionResult<{ count: number }>> => {
    await requireRole('admin', 'staff')
    const confirmed = await db
      .update(invoices)
      .set({ status: 'confirmed' })
      .where(eq(invoices.status, 'draft'))
      .returning({ id: invoices.id })
    return { ok: true, data: { count: confirmed.length } }
  },
)

export const runInvoiceAction = createServerFn({ method: 'POST' })
  .validator(invoiceActionSchema)
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireRole('admin', 'staff')
    return db.transaction(async (tx) => {
      const [invoice] = await tx
        .select({ status: invoices.status, amountPaid: invoices.amountPaid })
        .from(invoices)
        .where(eq(invoices.id, data.id))
        .for('update')
      if (!invoice) return { ok: false, error: 'This invoice no longer exists' }

      const result = invoiceTransition(invoice, data.action)
      if (!result.ok) return result
      await tx.update(invoices).set({ status: result.status }).where(eq(invoices.id, data.id))
      return { ok: true, data: undefined }
    })
  })

export const sendInvoiceFn = createServerFn({ method: 'POST' })
  .validator(sendInvoiceSchema)
  .handler(async ({ data }): Promise<ActionResult<{ to: string }>> => {
    await requireRole('admin', 'staff')
    const found = await getInvoice(db, data.id)
    if (!found) return { ok: false, error: 'This invoice no longer exists' }
    const { invoice, lines } = found
    if (!canSendInvoice(invoice.status)) {
      return { ok: false, error: 'Confirm the invoice before sending it' }
    }

    const summary = [
      `Invoice ${invoice.number} for ${invoice.subscriptionNumber}`,
      `Period: ${invoice.periodStart} to ${invoice.periodEnd}`,
      `Due: ${invoice.dueDate}`,
      '',
      ...lines.map((line) => `${line.description}: ${formatMoney(line.amount)}`),
      '',
      `Subtotal: ${formatMoney(invoice.subtotal)}`,
      ...(invoice.discountTotal > 0 ? [`Discounts: -${formatMoney(invoice.discountTotal)}`] : []),
      `Tax: ${formatMoney(invoice.taxTotal)}`,
      `Total: ${formatMoney(invoice.total)}`,
      `Amount due: ${formatMoney(invoice.total - invoice.amountPaid)}`,
      '',
      `View and print it: ${env.APP_URL}/portal/invoices/${invoice.id}`,
    ].join('\n')

    try {
      await sendMail({
        to: invoice.customerEmail,
        subject: `Invoice ${invoice.number} from Brightloop`,
        text: summary,
      })
    } catch (error) {
      log.error('invoice_email_failed', error)
      return { ok: false, error: 'The email could not be sent. Check the mail settings and retry.' }
    }
    await db.update(invoices).set({ sentAt: clock.now() }).where(eq(invoices.id, data.id))
    return { ok: true, data: { to: invoice.customerEmail } }
  })

export const recordPaymentFn = createServerFn({ method: 'POST' })
  .validator(recordPaymentSchema)
  .handler(async ({ data }) => {
    const user = await requireRole('admin', 'staff')
    return recordPayment(db, { ...data, recordedBy: user.id })
  })

export const sendReminderFn = createServerFn({ method: 'POST' })
  .validator(sendInvoiceSchema)
  .handler(async ({ data }): Promise<ActionResult<{ to: string }>> => {
    const user = await requireRole('admin', 'staff')
    return sendPaymentReminder(db, { invoiceId: data.id, sentBy: user.id })
  })
