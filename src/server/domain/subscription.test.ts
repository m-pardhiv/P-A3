import { describe, expect, it } from 'vitest'
import {
  type Catalogue,
  lineError,
  mergeLines,
  planAvailableOn,
  planError,
  planLine,
  productLine,
  renewalDates,
  totals,
} from './subscription'

const catalogue: Catalogue = {
  products: new Map([
    ['crm', { id: 'crm', name: 'CRM seat', type: 'software', salesPrice: 120000, active: true }],
    [
      'train',
      { id: 'train', name: 'Training', type: 'training', salesPrice: 500000, active: true },
    ],
    ['old', { id: 'old', name: 'Retired', type: 'software', salesPrice: 100, active: false }],
  ]),
  variants: new Map([
    [
      'odoo',
      { id: 'odoo', productId: 'crm', attribute: 'Brand', value: 'Odoo', extraPrice: 56000 },
    ],
  ]),
  taxRules: [
    { ratePercent: 18, productType: null, productId: null, isDefault: true, active: true },
    { ratePercent: 5, productType: 'training', productId: null, isDefault: false, active: true },
  ],
}

const plan = {
  name: 'Monthly team',
  price: 499900,
  minQuantity: 5,
  availableFrom: '2026-01-01',
  availableTo: '2026-12-31',
  active: true,
}

describe('pricing', () => {
  it('adds the variant extra price to the product price', () => {
    const line = productLine({ productId: 'crm', variantId: 'odoo', quantity: 2 }, catalogue)
    expect(line).toMatchObject({
      description: 'CRM seat (Odoo)',
      unitPrice: 176000,
      amount: 352000,
      taxRatePercent: 18,
    })
  })

  it('resolves tax per line', () => {
    const line = productLine({ productId: 'train', variantId: null, quantity: 1 }, catalogue)
    expect(line.taxRatePercent).toBe(5)
  })

  it('makes the plan fee a line with no product at the default tax rate', () => {
    expect(planLine(plan, 5, catalogue.taxRules)).toMatchObject({
      productId: null,
      unitPrice: 499900,
      amount: 2499500,
      taxRatePercent: 18,
    })
  })

  it('sums tax line by line', () => {
    const lines = [
      { amount: 100000, taxRatePercent: 18 },
      { amount: 200000, taxRatePercent: 5 },
    ]
    expect(totals(lines)).toEqual({ subtotal: 300000, tax: 28000, total: 328000 })
  })
})

describe('plan rules', () => {
  const valid = { startDate: '2026-06-01', planQuantity: 5 }

  it('accepts a valid subscription', () => {
    expect(planError(plan, valid)).toBeNull()
  })

  it('enforces the minimum quantity', () => {
    expect(planError(plan, { ...valid, planQuantity: 4 })?.field).toBe('planQuantity')
  })

  it('enforces the availability window', () => {
    expect(planError(plan, { ...valid, startDate: '2025-12-31' })?.field).toBe('startDate')
    expect(planError(plan, { ...valid, startDate: '2027-01-01' })?.field).toBe('startDate')
  })

  it('refuses an inactive plan', () => {
    expect(planError({ ...plan, active: false }, valid)?.field).toBe('planId')
  })
})

describe('line checks', () => {
  it('refuses an inactive product', () => {
    const lines = [{ productId: 'old', variantId: null, quantity: 1 }]
    expect(lineError(lines, catalogue)?.field).toBe('lines.0.productId')
  })

  it('refuses a variant from another product', () => {
    const lines = [{ productId: 'train', variantId: 'odoo', quantity: 1 }]
    expect(lineError(lines, catalogue)?.field).toBe('lines.0.variantId')
  })
})

describe('mergeLines', () => {
  const base = { ...planLine(plan, 5, catalogue.taxRules), id: 'base' }
  const kept = {
    ...productLine({ productId: 'crm', variantId: null, quantity: 1 }, catalogue),
    id: 'l1',
    unitPrice: 100000,
    amount: 100000,
  }

  it('keeps the copied price when the product is unchanged', () => {
    const inputs = [{ id: 'l1', productId: 'crm', variantId: null, quantity: 3 }]
    const [, line] = mergeLines([base, kept], 6, inputs, catalogue)
    expect(line).toMatchObject({ unitPrice: 100000, amount: 300000 })
  })

  it('reprices a line whose variant changed', () => {
    const inputs = [{ id: 'l1', productId: 'crm', variantId: 'odoo', quantity: 1 }]
    const [, line] = mergeLines([base, kept], 6, inputs, catalogue)
    expect(line.unitPrice).toBe(176000)
  })

  it('updates the plan line quantity and keeps it first', () => {
    const [first] = mergeLines([base, kept], 6, [], catalogue)
    expect(first).toMatchObject({ productId: null, quantity: 6, amount: 2999400 })
  })
})

describe('renewalDates', () => {
  it('starts the day after expiry and keeps the length', () => {
    expect(renewalDates({ startDate: '2026-01-01', expiryDate: '2026-12-31' })).toEqual({
      startDate: '2027-01-01',
      expiryDate: '2027-12-31',
    })
  })
})

describe('planAvailableOn', () => {
  const plan = { active: true, availableFrom: '2026-01-01', availableTo: '2026-06-30' }

  it('is available inside the window, including both ends', () => {
    expect(planAvailableOn(plan, '2026-01-01')).toBe(true)
    expect(planAvailableOn(plan, '2026-06-30')).toBe(true)
  })

  it('is unavailable before it opens and after it ends', () => {
    expect(planAvailableOn(plan, '2025-12-31')).toBe(false)
    expect(planAvailableOn(plan, '2026-07-01')).toBe(false)
  })

  it('is unavailable when switched off, and open-ended without dates', () => {
    expect(planAvailableOn({ ...plan, active: false }, '2026-03-01')).toBe(false)
    expect(
      planAvailableOn({ active: true, availableFrom: null, availableTo: null }, '2030-01-01'),
    ).toBe(true)
  })
})
