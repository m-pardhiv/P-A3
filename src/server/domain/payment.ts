import type { InvoiceStatus } from './invoice-state'

type Invoice = { status: InvoiceStatus; total: number; amountPaid: number }

/**
 * Checks a payment against an invoice and says where the invoice ends up. Only confirmed invoices
 * take payments, a partial payment leaves it confirmed, and paying it off makes it paid.
 */
export function applyPayment(invoice: Invoice, amount: number) {
  if (invoice.status !== 'confirmed') {
    return {
      ok: false as const,
      error:
        invoice.status === 'paid'
          ? 'This invoice is already paid'
          : `Payments can only be recorded on a confirmed invoice, not a ${invoice.status} one`,
    }
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false as const, error: 'Enter an amount above zero' }
  }
  const due = invoice.total - invoice.amountPaid
  if (amount > due) {
    return { ok: false as const, error: 'This is more than is owed on the invoice' }
  }
  const amountPaid = invoice.amountPaid + amount
  return {
    ok: true as const,
    amountPaid,
    status: (amountPaid === invoice.total ? 'paid' : 'confirmed') as InvoiceStatus,
  }
}
