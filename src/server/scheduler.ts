import { and, eq, isNull } from 'drizzle-orm'
import { db } from '~/db/client'
import { billingRuns } from '~/db/schema'
import { runBilling } from './billing-run'
import { clock } from './clock'
import { env } from './env'

const CHECK_EVERY_MS = 10 * 60 * 1000
const state = globalThis as { __billingScheduler?: NodeJS.Timeout }

/** Runs once on each business day, during BILLING_HOUR, unless a scheduled run already happened. */
async function checkOnce() {
  try {
    if (clock.hour() !== env.BILLING_HOUR) return
    const today = clock.today()
    const [done] = await db
      .select({ id: billingRuns.id })
      .from(billingRuns)
      .where(and(eq(billingRuns.asOfDate, today), isNull(billingRuns.triggeredBy)))
      .limit(1)
    if (!done) await runBilling(db, { asOf: today, triggeredBy: null })
  } catch (error) {
    console.error('Scheduled billing failed', error)
  }
}

/**
 * A plain interval inside the server, with no job library. It starts with the first request and
 * is guarded on globalThis so hot reloads never start a second one. If the server was down at
 * BILLING_HOUR, the next run catches up every missed period anyway.
 */
export function ensureBillingScheduler() {
  if (env.BILLING_SCHEDULER === 'off' || state.__billingScheduler) return
  state.__billingScheduler = setInterval(checkOnce, CHECK_EVERY_MS)
  state.__billingScheduler.unref()
}
