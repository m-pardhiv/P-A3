import { describe, expect, it } from 'vitest'
import { daysLeft, termProgress } from './term'

describe('term progress', () => {
  it('is zero at the start, half way through, and complete at the end', () => {
    expect(termProgress('2026-01-01', '2026-01-11', '2026-01-01')).toBe(0)
    expect(termProgress('2026-01-01', '2026-01-11', '2026-01-06')).toBe(50)
    expect(termProgress('2026-01-01', '2026-01-11', '2026-01-11')).toBe(100)
  })

  it('stays between 0 and 100 outside the term', () => {
    expect(termProgress('2026-02-01', '2026-03-01', '2026-01-01')).toBe(0)
    expect(termProgress('2026-02-01', '2026-03-01', '2027-01-01')).toBe(100)
  })

  it('shows nothing for an open-ended subscription', () => {
    expect(termProgress('2026-01-01', null, '2026-06-01')).toBe(0)
    expect(daysLeft(null, '2026-06-01')).toBeNull()
  })

  it('counts days left and never goes below zero', () => {
    expect(daysLeft('2026-06-18', '2026-06-01')).toBe(17)
    expect(daysLeft('2026-05-01', '2026-06-01')).toBe(0)
  })
})
