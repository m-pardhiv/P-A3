import { eq } from 'drizzle-orm'
import type { Database } from '~/db/client'
import { isUniqueViolation } from '~/db/errors'
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
  /** The same key twice returns the first result instead of recording another payment. */
  idempotencyKey?: string
}

/**
 * Records a payment and updates the invoice in one transaction. The invoice row is locked first,
 * so two payments at once cannot both pass the overpayment check.
 */
export async function recordPayment(
  database: Database,
  input: PaymentInput,
): Promise<ActionResult<{ status: string; amountPaid: number }>> {
  try {
    return await recordOnce(database, input)
  } catch (error) {
    // Two identical requests raced past the lookup: the unique key stopped the second one.
    if (input.idempotencyKey && isUniqueViolation(error)) return replay(database, input)
    throw error
  }
}

type Outcome = ActionResult<{ status: string; amountPaid: number }>

async function replay(database: Database, input: PaymentInput): Promise<Outcome> {
  const [invoice] = await database
    .select({ status: invoices.status, amountPaid: invoices.amountPaid })
    .from(invoices)
    .where(eq(invoices.id, input.invoiceId))
  return invoice
    ? { ok: true, data: { status: invoice.status, amountPaid: invoice.amountPaid } }
    : { ok: false, error: 'This invoice no longer exists' }
}

function recordOnce(database: Database, input: PaymentInput): Promise<Outcome> {
  return database.transaction(async (tx): Promise<Outcome> => {
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

    if (input.idempotencyKey) {
      const [already] = await tx
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.idempotencyKey, input.idempotencyKey))
      if (already) {
        return { ok: true, data: { status: invoice.status, amountPaid: invoice.amountPaid } }
      }
    }

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
      idempotencyKey: input.idempotencyKey,
    })
    await tx
      .update(invoices)
      .set({ amountPaid: result.amountPaid, status: result.status })
      .where(eq(invoices.id, input.invoiceId))
    return { ok: true, data: { status: result.status, amountPaid: result.amountPaid } }
  })
}
