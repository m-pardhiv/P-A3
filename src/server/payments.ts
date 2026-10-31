import { eq } from 'drizzle-orm'
import type { Database } from '~/db/client'
import { invoices, payments } from '~/db/schema'
import type { ActionResult } from '~/shared/result'
import { clock } from './clock'
import { applyPayment } from './domain/payment'

export type PaymentInput = {
  invoiceId: string
  method: 'cash' | 'bank_transfer' | 'card' | 'upi' | 'cheque'
  amount: number
  paidOn: string
  note: string | null
  recordedBy: string
}

/**
 * Records a payment and updates the invoice in one transaction. The invoice row is locked first,
 * so two payments at once cannot both pass the overpayment check.
 */
export async function recordPayment(
  database: Database,
  input: PaymentInput,
): Promise<ActionResult<{ status: string; amountPaid: number }>> {
  return database.transaction(
    async (tx): Promise<ActionResult<{ status: string; amountPaid: number }>> => {
      const [invoice] = await tx
        .select({
          id: invoices.id,
          status: invoices.status,
          total: invoices.total,
          amountPaid: invoices.amountPaid,
          issueDate: invoices.issueDate,
        })
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .for('update')
      if (!invoice) return { ok: false, error: 'This invoice no longer exists' }

      if (input.paidOn > clock.today()) {
        return { ok: false, fieldErrors: { paidOn: 'A payment cannot be dated in the future' } }
      }
      if (input.paidOn < invoice.issueDate) {
        return {
          ok: false,
          fieldErrors: { paidOn: 'A payment cannot be dated before the invoice' },
        }
      }

      const result = applyPayment(invoice, input.amount)
      if (!result.ok) {
        const overpaid = result.error.startsWith('This is more')
        return overpaid
          ? { ok: false, fieldErrors: { amount: result.error } }
          : { ok: false, error: result.error }
      }

      await tx.insert(payments).values({
        invoiceId: input.invoiceId,
        method: input.method,
        amount: input.amount,
        paidOn: input.paidOn,
        note: input.note,
        recordedBy: input.recordedBy,
      })
      await tx
        .update(invoices)
        .set({ amountPaid: result.amountPaid, status: result.status })
        .where(eq(invoices.id, input.invoiceId))
      return { ok: true, data: { status: result.status, amountPaid: result.amountPaid } }
    },
  )
}
