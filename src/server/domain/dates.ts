import {
  addDays as addDaysToDate,
  addMonths as addMonthsToDate,
  addYears as addYearsToDate,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
  parseISO,
} from 'date-fns'

// Business dates travel as YYYY-MM-DD strings, matching Postgres `date` columns.
const toText = (date: Date) => format(date, 'yyyy-MM-dd')

export const addDays = (date: string, days: number) => toText(addDaysToDate(parseISO(date), days))

export const addMonths = (date: string, months: number) =>
  toText(addMonthsToDate(parseISO(date), months))

export const addYears = (date: string, years: number) =>
  toText(addYearsToDate(parseISO(date), years))

export const daysBetween = (from: string, to: string) =>
  differenceInCalendarDays(parseISO(to), parseISO(from))

export const monthsBetween = (from: string, to: string) =>
  differenceInCalendarMonths(parseISO(to), parseISO(from))

/** First day of the month a date falls in, as YYYY-MM-01. */
export const monthStart = (date: string) => `${date.slice(0, 7)}-01`

/**
 * The last `count` calendar months ending with the one `today` is in, oldest first. Each is the
 * month's first day, so it can be compared with a date column and used as a chart label.
 */
export function lastMonths(today: string, count: number) {
  const first = monthStart(today)
  return Array.from({ length: count }, (_, index) => addMonths(first, index - (count - 1)))
}
