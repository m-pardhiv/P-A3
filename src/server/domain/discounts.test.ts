import { describe, expect, it } from 'vitest'
import { buildInvoice } from './billing'
import { type DiscountRule, isUsable, saving, selectDiscounts } from './discounts'

const rule = (overrides: Partial<DiscountRule>): DiscountRule => ({
  id: 'd1',
  name: 'Ten off',
  kind: 'percent',
  value: 10,
  minPurchaseAmount: 0,
  minQuantity: 1,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  usageLimit: 5,
  usedCount: 0,
  scope: 'subscription',
  productId: null,
  active: true,
  ...overrides,
})

const lines = [
  { productId: null, quantity: 1, amount: 100000, taxRatePercent: 18 },
  { productId: 'crm', quantity: 3, amount: 300000, taxRatePercent: 18 },
]

describe('isUsable', () => {
  it('needs an active rule inside its date window with uses left', () => {
    expect(isUsable(rule({}), '2026-06-01')).toBe(true)
    expect(isUsable(rule({ active: false }), '2026-06-01')).toBe(false)
    expect(isUsable(rule({}), '2025-12-31')).toBe(false)
    expect(isUsable(rule({}), '2027-01-01')).toBe(false)
    expect(isUsable(rule({ usedCount: 5 }), '2026-06-01')).toBe(false)
  })

  it('includes the first and last day of the window', () => {
    expect(isUsable(rule({}), '2026-01-01')).toBe(true)
    expect(isUsable(rule({}), '2026-12-31')).toBe(true)
  })
})

describe('saving', () => {
  it('takes a percentage, rounded half up', () => {
    expect(saving(rule({ value: 10 }), 100005)).toBe(10001)
  })

  it('never takes more than the amount', () => {
    expect(saving(rule({ kind: 'fixed', value: 999999 }), 5000)).toBe(5000)
  })
})

describe('selectDiscounts', () => {
  it('applies a subscription discount to the whole invoice', () => {
    const [applied] = selectDiscounts(lines, [rule({})], '2026-06-01')
    expect(applied).toMatchObject({ id: 'd1', scope: 'subscription', amount: 40000 })
  })

  it('enforces the minimum purchase and minimum quantity', () => {
    expect(selectDiscounts(lines, [rule({ minPurchaseAmount: 400001 })], '2026-06-01')).toEqual([])
    expect(selectDiscounts(lines, [rule({ minQuantity: 5 })], '2026-06-01')).toEqual([])
    expect(selectDiscounts(lines, [rule({ minQuantity: 4 })], '2026-06-01')).toHaveLength(1)
  })

  it('applies a product discount only to that product line', () => {
    const product = rule({
      id: 'p1',
      scope: 'product',
      productId: 'crm',
      kind: 'fixed',
      value: 10000,
    })
    const [applied] = selectDiscounts(lines, [product], '2026-06-01')
    expect(applied).toMatchObject({ id: 'p1', scope: 'product', amount: 10000 })
    expect(selectDiscounts(lines, [{ ...product, productId: 'other' }], '2026-06-01')).toEqual([])
  })

  it('picks the largest saving when several rules qualify', () => {
    const small = rule({ id: 'small', value: 5 })
    const big = rule({ id: 'big', value: 20 })
    const applied = selectDiscounts(lines, [small, big], '2026-06-01')
    expect(applied.map((a) => a.id)).toEqual(['big'])
  })

  it('applies at most one discount per scope', () => {
    const product = rule({ id: 'p', scope: 'product', productId: 'crm', value: 10 })
    const applied = selectDiscounts(
      lines,
      [product, rule({ id: 's1' }), rule({ id: 's2', value: 5 })],
      '2026-06-01',
    )
    expect(applied.map((a) => a.id).sort()).toEqual(['p', 's1'])
  })

  it('takes the subscription discount from what the product discount left', () => {
    const product = rule({
      id: 'p',
      scope: 'product',
      productId: 'crm',
      kind: 'fixed',
      value: 100000,
    })
    const applied = selectDiscounts(lines, [product, rule({ id: 's' })], '2026-06-01')
    expect(applied.find((a) => a.id === 's')?.amount).toBe(30000)
  })

  it('ignores an expired or used-up rule', () => {
    expect(selectDiscounts(lines, [rule({ endDate: '2026-05-31' })], '2026-06-01')).toEqual([])
    expect(selectDiscounts(lines, [rule({ usedCount: 5 })], '2026-06-01')).toEqual([])
  })
})

describe('discounts on an invoice', () => {
  const source = [
    { description: 'Plan', productId: null, quantity: 1, unitPrice: 100000, taxRatePercent: 18 },
    { description: 'CRM', productId: 'crm', quantity: 3, unitPrice: 100000, taxRatePercent: 18 },
  ]

  it('adds a negative line and reduces the tax with it', () => {
    const invoice = buildInvoice({
      lines: source,
      discounts: [rule({})],
      issueDate: '2026-06-01',
      paymentTermDays: 0,
    })
    const discountLine = invoice.lines.at(-1)
    expect(discountLine).toMatchObject({
      description: 'Discount: Ten off',
      amount: -40000,
      taxAmount: -7200,
    })
    expect(invoice.subtotal).toBe(400000)
    expect(invoice.discountTotal).toBe(40000)
    expect(invoice.taxTotal).toBe(72000 - 7200)
    expect(invoice.total).toBe(400000 - 40000 + 64800)
  })
})
