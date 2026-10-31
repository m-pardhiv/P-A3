import { and, eq, isNull } from 'drizzle-orm'
import { db } from '~/db/client'
import { billingRuns } from '~/db/schema'
import { runBilling } from './billing-run'
import { clock } from './clock'
import { env } from './env'
import { log } from './log'

const CHECK_EVERY_MS = 10 * 60 * 1000
const state = globalThis as { __billingScheduler?: NodeJS.Timeout; __billingRunning?: boolean }

/**
 * Runs once on each business day, from BILLING_HOUR onwards, unless a scheduled run already
 * happened that day. "From" and not "during", so a server that was down at that hour still bills
 * the same day as soon as it is back.
 */
async function checkOnce() {
  if (state.__billingRunning) return
  state.__billingRunning = true
  try {
    if (clock.hour() < env.BILLING_HOUR) return
    const today = clock.today()
    const [done] = await db
      .select({ id: billingRuns.id })
      .from(billingRuns)
      .where(and(eq(billingRuns.asOfDate, today), isNull(billingRuns.triggeredBy)))
      .limit(1)
    if (!done) {
      const result = await runBilling(db, { asOf: today, triggeredBy: null })
      log.info('scheduled_billing_finished', {
        asOf: result.asOf,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
      })
    }
  } catch (error) {
    log.error('scheduled_billing_failed', error)
  } finally {
    state.__billingRunning = false
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
  // Check straight away too, so a restart after BILLING_HOUR does not wait ten minutes.
  void checkOnce()
}
