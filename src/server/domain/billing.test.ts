import { describe, expect, it } from 'vitest'
import { buildInvoice, duePeriods, periodIndexAtOrAfter, periodStart } from './billing'

describe('period boundaries come from the anchor', () => {
  it('keeps 31 January monthly dates correct', () => {
    const starts = [0, 1, 2, 3, 4].map((k) => periodStart('2026-01-31', 'monthly', k))
    expect(starts).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31'])
  })

  it('does not drift after a short month', () => {
    // Adding a month to the previous date would give 28 March here.
    expect(periodStart('2026-01-31', 'monthly', 2)).toBe('2026-03-31')
  })

  it('handles leap years', () => {
    expect(periodStart('2028-01-31', 'monthly', 1)).toBe('2028-02-29')
    expect(periodStart('2028-02-29', 'yearly', 1)).toBe('2029-02-28')
  })

  it('steps daily, weekly and yearly plans', () => {
    expect(periodStart('2026-01-01', 'daily', 10)).toBe('2026-01-11')
    expect(periodStart('2026-01-01', 'weekly', 3)).toBe('2026-01-22')
    expect(periodStart('2026-01-01', 'yearly', 2)).toBe('2028-01-01')
  })
})

describe('periodIndexAtOrAfter', () => {
  it('finds the index of a period start exactly', () => {
    expect(periodIndexAtOrAfter('2026-01-31', 'monthly', '2026-03-31')).toBe(2)
    expect(periodIndexAtOrAfter('2026-01-01', 'weekly', '2026-01-22')).toBe(3)
  })

  it('rounds up between starts', () => {
    expect(periodIndexAtOrAfter('2026-01-31', 'monthly', '2026-03-01')).toBe(2)
    expect(periodIndexAtOrAfter('2026-01-01', 'yearly', '2026-06-01')).toBe(1)
  })

  it('returns 0 on or before the anchor', () => {
    expect(periodIndexAtOrAfter('2026-01-31', 'monthly', '2026-01-31')).toBe(0)
  })
})

describe('duePeriods', () => {
  const monthly = (overrides: Partial<Parameters<typeof duePeriods>[0]> = {}) =>
    duePeriods({
      startDate: '2026-01-01',
      expiryDate: null,
      nextInvoiceDate: '2026-01-01',
      billingPeriod: 'monthly',
      asOf: '2026-03-15',
      ...overrides,
    })

  it('creates one period per missed month', () => {
    const { periods, nextStart } = monthly()
    expect(periods.map((p) => p.start)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
    expect(nextStart).toBe('2026-04-01')
  })

  it('ends each period the day before the next one starts', () => {
    expect(monthly().periods.map((p) => p.end)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('creates nothing before the next invoice date', () => {
    const { periods, nextStart } = monthly({ asOf: '2026-01-01', nextInvoiceDate: '2026-02-01' })
    expect(periods).toEqual([])
    expect(nextStart).toBe('2026-02-01')
  })

  it('resumes from the next invoice date, not the start', () => {
    const { periods } = monthly({ nextInvoiceDate: '2026-03-01' })
    expect(periods.map((p) => p.start)).toEqual(['2026-03-01'])
  })

  it('stops at the expiry date and then stops billing', () => {
    const { periods, nextStart } = monthly({ expiryDate: '2026-02-15', asOf: '2026-12-31' })
    expect(periods.map((p) => p.start)).toEqual(['2026-01-01', '2026-02-01'])
    expect(nextStart).toBeNull()
  })

  it('cuts the last period short at the expiry date', () => {
    const { periods } = monthly({ expiryDate: '2026-02-15', asOf: '2026-12-31' })
    expect(periods[1].end).toBe('2026-02-15')
  })

  it('catches up a 31 January anchor correctly', () => {
    const { periods, nextStart } = monthly({
      startDate: '2026-01-31',
      nextInvoiceDate: '2026-01-31',
      asOf: '2026-04-01',
    })
    expect(periods.map((p) => p.start)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    expect(periods.map((p) => p.end)).toEqual(['2026-02-27', '2026-03-30', '2026-04-29'])
    expect(nextStart).toBe('2026-04-30')
  })

  it('bills a daily plan once per day', () => {
    const { periods } = duePeriods({
      startDate: '2026-01-01',
      expiryDate: null,
      nextInvoiceDate: '2026-01-01',
      billingPeriod: 'daily',
      asOf: '2026-01-05',
    })
    expect(periods).toHaveLength(5)
  })
})

describe('buildInvoice', () => {
  const lines = [
    { description: 'Plan', productId: null, quantity: 1, unitPrice: 199900, taxRatePercent: 18 },
    { description: 'Training', productId: 't', quantity: 2, unitPrice: 500000, taxRatePercent: 5 },
  ]

  it('rounds tax per line and totals the invoice', () => {
    const invoice = buildInvoice({
      lines,
      discounts: [],
      issueDate: '2026-01-01',
      paymentTermDays: 15,
    })
    expect(invoice.lines.map((l) => l.taxAmount)).toEqual([35982, 50000])
    expect(invoice.subtotal).toBe(1199900)
    expect(invoice.taxTotal).toBe(85982)
    expect(invoice.total).toBe(1285882)
    expect(invoice.discountTotal).toBe(0)
  })

  it('sets the due date from the payment terms', () => {
    const invoice = buildInvoice({
      lines,
      discounts: [],
      issueDate: '2026-01-20',
      paymentTermDays: 15,
    })
    expect(invoice.dueDate).toBe('2026-02-04')
  })

  it('due immediately means due on the issue date', () => {
    const invoice = buildInvoice({
      lines,
      discounts: [],
      issueDate: '2026-01-20',
      paymentTermDays: 0,
    })
    expect(invoice.dueDate).toBe('2026-01-20')
  })
})
