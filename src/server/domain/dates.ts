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
