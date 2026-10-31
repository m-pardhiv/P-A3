export type InvoiceStatus = 'draft' | 'confirmed' | 'paid' | 'cancelled'
export type InvoiceAction = 'confirm' | 'cancel' | 'pay'

/** The only legal moves. Pay is not a button: recording the final payment does it. */
export const INVOICE_TRANSITIONS: Record<
  InvoiceStatus,
  Partial<Record<InvoiceAction, InvoiceStatus>>
> = {
  draft: { confirm: 'confirmed', cancel: 'cancelled' },
  confirmed: { cancel: 'cancelled', pay: 'paid' },
  paid: {},
  cancelled: {},
}

export function invoiceTransition(
  invoice: { status: InvoiceStatus; amountPaid: number },
  action: InvoiceAction,
) {
  const status = INVOICE_TRANSITIONS[invoice.status][action]
  if (!status) {
    return { ok: false as const, error: `A ${invoice.status} invoice cannot do that` }
  }
  // There are no refunds, so an invoice that has taken money cannot be cancelled.
  if (action === 'cancel' && invoice.amountPaid > 0) {
    return { ok: false as const, error: 'An invoice with payments cannot be cancelled' }
  }
  return { ok: true as const, status }
}

export const allowedInvoiceActions = (invoice: { status: InvoiceStatus; amountPaid: number }) =>
  (['confirm', 'cancel'] as const).filter((action) => invoiceTransition(invoice, action).ok)

export const canSendInvoice = (status: InvoiceStatus) => status === 'confirmed' || status === 'paid'

/** Overdue is derived, never stored: confirmed, something still owed, and past its due date. */
export const isOverdue = (
  invoice: { status: InvoiceStatus; total: number; amountPaid: number; dueDate: string },
  today: string,
) =>
  invoice.status === 'confirmed' &&
  invoice.total - invoice.amountPaid > 0 &&
  invoice.dueDate < today
