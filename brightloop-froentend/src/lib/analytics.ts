import type { Payment } from '@/types'
import { addMonths, formatMonth, parseDate, startOfToday } from './format'

export interface MonthlyPoint {
  key: string
  month: string
  amount: number
  cumulative: number
}

/** Successful payments grouped by calendar month for the trailing `months` months (oldest → newest). */
export function monthlyPayments(payments: Payment[], months = 6): MonthlyPoint[] {
  const now = startOfToday()
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), i - (months - 1))
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: formatMonth(d), amount: 0, cumulative: 0 }
  })
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const p of payments) {
    if (p.status !== 'succeeded') continue
    const d = parseDate(p.date)
    const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) bucket.amount += p.amount
  }
  let running = payments
    .filter((p) => p.status === 'succeeded' && parseDate(p.date) < new Date(now.getFullYear(), now.getMonth() - (months - 1), 1))
    .reduce((sum, p) => sum + p.amount, 0)
  for (const b of buckets) {
    b.amount = Math.round(b.amount * 100) / 100
    running += b.amount
    b.cumulative = Math.round(running * 100) / 100
  }
  return buckets
}
