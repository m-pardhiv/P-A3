import { describe, expect, it } from 'vitest'
import {
  allowedInvoiceActions,
  canSendInvoice,
  invoiceTransition,
  isOverdue,
} from './invoice-state'

describe('invoice transitions', () => {
  it('confirms a draft', () => {
    expect(invoiceTransition({ status: 'draft', amountPaid: 0 }, 'confirm')).toEqual({
      ok: true,
      status: 'confirmed',
    })
  })

  it('cancels from draft or confirmed, never from paid', () => {
    expect(invoiceTransition({ status: 'draft', amountPaid: 0 }, 'cancel').ok).toBe(true)
    expect(invoiceTransition({ status: 'confirmed', amountPaid: 0 }, 'cancel').ok).toBe(true)
    expect(invoiceTransition({ status: 'paid', amountPaid: 100 }, 'cancel').ok).toBe(false)
  })

  it('cannot move a cancelled invoice anywhere', () => {
    expect(allowedInvoiceActions({ status: 'cancelled', amountPaid: 0 })).toEqual([])
  })

  it('cannot cancel an invoice that has taken a partial payment', () => {
    const result = invoiceTransition({ status: 'confirmed', amountPaid: 500 }, 'cancel')
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('payments') })
  })

  it('cannot confirm twice', () => {
    expect(invoiceTransition({ status: 'confirmed', amountPaid: 0 }, 'confirm').ok).toBe(false)
  })

  it('only sends invoices that have been confirmed', () => {
    expect(canSendInvoice('draft')).toBe(false)
    expect(canSendInvoice('confirmed')).toBe(true)
    expect(canSendInvoice('paid')).toBe(true)
    expect(canSendInvoice('cancelled')).toBe(false)
  })
})

describe('isOverdue', () => {
  const invoice = {
    status: 'confirmed' as const,
    total: 1000,
    amountPaid: 0,
    dueDate: '2026-06-01',
  }

  it('is overdue the day after the due date', () => {
    expect(isOverdue(invoice, '2026-06-02')).toBe(true)
  })

  it('is not overdue on the due date itself', () => {
    expect(isOverdue(invoice, '2026-06-01')).toBe(false)
  })

  it('is still overdue with a partial payment', () => {
    expect(isOverdue({ ...invoice, amountPaid: 400 }, '2026-06-02')).toBe(true)
  })

  it('is never overdue when drafted, paid or cancelled', () => {
    for (const status of ['draft', 'paid', 'cancelled'] as const) {
      expect(isOverdue({ ...invoice, status }, '2026-06-02')).toBe(false)
    }
  })
})
