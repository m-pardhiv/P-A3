import { addDays as addDaysToDate, differenceInCalendarDays, format, parseISO } from 'date-fns'

// Business dates travel as YYYY-MM-DD strings, matching Postgres `date` columns.
export const addDays = (date: string, days: number) =>
  format(addDaysToDate(parseISO(date), days), 'yyyy-MM-dd')

export const daysBetween = (from: string, to: string) =>
  differenceInCalendarDays(parseISO(to), parseISO(from))
