import { describe, expect, it } from 'vitest'
import { resolveTaxRate, type TaxRule, taxOn } from './tax'

const rule = (overrides: Partial<TaxRule>): TaxRule => ({
  ratePercent: 0,
  productType: null,
  productId: null,
  isDefault: false,
  active: true,
  ...overrides,
})

const rules = [
  rule({ ratePercent: 18, isDefault: true }),
  rule({ ratePercent: 5, productType: 'training' }),
  rule({ ratePercent: 12, productId: 'p1' }),
]

describe('resolveTaxRate', () => {
  it('prefers a rule for the specific product', () => {
    expect(resolveTaxRate({ id: 'p1', type: 'training' }, rules)).toBe(12)
  })

  it('falls back to the product type', () => {
    expect(resolveTaxRate({ id: 'p2', type: 'training' }, rules)).toBe(5)
  })

  it('falls back to the default', () => {
    expect(resolveTaxRate({ id: 'p2', type: 'software' }, rules)).toBe(18)
  })

  it('uses the default for a plan base fee', () => {
    expect(resolveTaxRate(null, rules)).toBe(18)
  })

  it('ignores inactive rules', () => {
    const inactive = [rule({ ratePercent: 5, productType: 'training', active: false }), rules[0]]
    expect(resolveTaxRate({ id: 'p2', type: 'training' }, inactive)).toBe(18)
  })

  it('returns zero when nothing matches', () => {
    expect(resolveTaxRate({ id: 'p2', type: 'software' }, [])).toBe(0)
  })
})

describe('taxOn', () => {
  it('calculates tax in paise', () => {
    expect(taxOn(100000, 18)).toBe(18000)
  })

  it('rounds half up', () => {
    expect(taxOn(50, 1)).toBe(1)
    expect(taxOn(49, 1)).toBe(0)
  })

  it('handles fractional rates without float drift', () => {
    expect(taxOn(100000, 2.5)).toBe(2500)
  })
})
