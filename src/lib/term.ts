import { daysFromNow } from './format'

/** How much of a subscription's term has passed, as a whole percent from 0 to 100. */
export function termProgress(start: string, end: string | null, today: string) {
  if (!end) return 0
  const total = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)
  if (total <= 0) return 100
  const done = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)))
}

/** Days left until a date, never negative. */
export const daysLeft = (end: string | null, today: string) =>
  end ? Math.max(0, daysFromNow(end, today)) : null

/** "per month", "per year": what one billed period is called. */
export const periodUnit: Record<string, string> = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}
