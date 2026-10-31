const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })

export const formatMoney = (paise: number) => inr.format(paise / 100)

/** Paise as the plain rupee text a money input expects, such as 1200.50. */
export const paiseToInput = (paise: number) => (paise / 100).toFixed(2)

/** Business dates are calendar days, so they format in UTC and never shift by a time zone. */
export const formatDate = (date: string | null | undefined) =>
  date ? dateFormat.format(new Date(`${date}T00:00:00Z`)) : 'None'

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
})

/** A moment in time, such as when a billing run happened, shown in Indian time. */
export const formatDateTime = (value: Date | string) => dateTimeFormat.format(new Date(value))

/** `bank_transfer` becomes "Bank transfer". */
export const humanize = (value: string) => capitalize(value.replaceAll('_', ' '))

const hourInIndia = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Kolkata',
})

/** "Good morning", by the hour in India, matching how the business dates are kept. */
export function greetingForNow(now = new Date()) {
  const hour = Number(hourInIndia.format(now))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Whole days from today to a date, negative when it has passed. */
export function daysFromNow(date: string, today: string) {
  const ms = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** "18 days", "Today", "Tomorrow", "3 days ago". */
export function relativeDays(date: string, today: string) {
  const days = daysFromNow(date, today)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}
