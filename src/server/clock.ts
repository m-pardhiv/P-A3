// All business dates are Indian calendar days, whatever time zone the server runs in.
const BUSINESS_TIME_ZONE = 'Asia/Kolkata'

const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIME_ZONE })

export const clock = {
  /** Current instant, for audit timestamps and token expiry. */
  now: () => new Date(),
  /** Current business date as YYYY-MM-DD, matching Postgres `date` columns. */
  today: () => dateFormat.format(new Date()),
}
