import { describe, expect, it } from 'vitest'
import { addDays, addMonths, addYears, daysBetween } from './dates'

describe('business dates', () => {
  it('adds days across month and year ends, and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('works out when a quotation stops being valid', () => {
    // Created on 10 March with 30 days of validity: valid through 9 April.
    expect(addDays('2026-03-10', 30)).toBe('2026-04-09')
    expect(addDays('2026-03-10', 0)).toBe('2026-03-10')
  })

  it('adds months and years from an anchor without drifting', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-01-31', 2)).toBe('2026-03-31')
    expect(addYears('2024-02-29', 1)).toBe('2025-02-28')
  })

  it('counts calendar days between two dates', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30)
    expect(daysBetween('2026-03-31', '2026-03-01')).toBe(-30)
  })
})
