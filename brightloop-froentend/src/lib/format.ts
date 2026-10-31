/** Parse an ISO date (YYYY-MM-DD) as a local date, avoiding UTC off-by-one shifts. */
export function parseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, lastDay))
  return next
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

const currencyFormatters = new Map<string, Intl.NumberFormat>()

export function formatCurrency(amount: number, currency = 'USD', opts: { compact?: boolean } = {}) {
  const key = `${currency}-${opts.compact ? 'c' : 'f'}`
  let fmt = currencyFormatters.get(key)
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      ...(opts.compact
        ? { notation: 'compact', maximumFractionDigits: 1 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    })
    currencyFormatters.set(key, fmt)
  }
  return fmt.format(amount)
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const shortDateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' })
const monthYearFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const longDateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export const formatDate = (iso: string) => dateFmt.format(parseDate(iso))
export const formatShortDate = (iso: string) => shortDateFmt.format(parseDate(iso))
export const formatMonth = (date: Date) => monthFmt.format(date)
export const formatMonthYear = (date: Date) => monthYearFmt.format(date)
export const formatLongDate = (date: Date) => longDateFmt.format(date)

export function formatRelativeDays(iso: string) {
  const diff = daysBetween(startOfToday(), parseDate(iso))
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 0) return diff < 60 ? `in ${diff} days` : `in ${Math.round(diff / 30)} months`
  const ago = Math.abs(diff)
  return ago < 60 ? `${ago} days ago` : `${Math.round(ago / 30)} months ago`
}

export function greetingForNow(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export const cycleLabel: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

export const cycleUnit: Record<string, string> = {
  monthly: 'month',
  quarterly: 'quarter',
  yearly: 'year',
}

/** 0.0825 → "8.25%", 0.08 → "8%". */
export const formatPercent = (rate: number) => `${+(rate * 100).toFixed(2)}%`
