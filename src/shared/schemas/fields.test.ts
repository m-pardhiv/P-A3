import { describe, expect, it } from 'vitest'
import { moneySchema, rupeesToPaise } from './fields'

describe('moneySchema', () => {
  it('turns rupees into integer paise', () => {
    expect(moneySchema.parse('1200')).toBe(120000)
    expect(moneySchema.parse('1200.5')).toBe(120050)
    expect(moneySchema.parse('1200.50')).toBe(120050)
    expect(moneySchema.parse('0.07')).toBe(7)
    expect(moneySchema.parse(560)).toBe(56000)
  })

  it('does not drift the way a float would', () => {
    expect(moneySchema.parse('19.99')).toBe(1999)
    expect(moneySchema.parse('1.15')).toBe(115)
  })

  it('rejects anything that is not an amount', () => {
    for (const text of ['', 'abc', '12x', '-5', '1.234', '1,200', '.5', '1e3']) {
      expect(moneySchema.safeParse(text).success, text).toBe(false)
    }
  })

  it('rupeesToPaise handles whole and fractional parts', () => {
    expect(rupeesToPaise('5')).toBe(500)
    expect(rupeesToPaise('5.1')).toBe(510)
  })
})
