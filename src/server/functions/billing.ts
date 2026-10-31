import { createServerFn } from '@tanstack/react-start'
import { count, desc, eq } from 'drizzle-orm'
import { db } from '~/db/client'
import { billingRuns, users } from '~/db/schema'
import { runBilling } from '~/server/billing-run'
import { clock } from '~/server/clock'
import { requireRole } from '~/server/session'
import type { ActionResult } from '~/shared/result'
import { billingRunsSchema, runBillingSchema } from '~/shared/schemas/invoices'
import { PAGE_SIZE } from '~/shared/schemas/pagination'

export const listBillingRuns = createServerFn({ method: 'GET' })
  .validator(billingRunsSchema)
  .handler(async ({ data }) => {
    await requireRole('admin', 'staff')
    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: billingRuns.id,
          runAt: billingRuns.runAt,
          asOfDate: billingRuns.asOfDate,
          createdCount: billingRuns.createdCount,
          skippedCount: billingRuns.skippedCount,
          errorCount: billingRuns.errorCount,
          details: billingRuns.details,
          triggeredByName: users.name,
        })
        .from(billingRuns)
        .leftJoin(users, eq(users.id, billingRuns.triggeredBy))
        .orderBy(desc(billingRuns.runAt))
        .limit(PAGE_SIZE)
        .offset((data.page - 1) * PAGE_SIZE),
      db.select({ total: count() }).from(billingRuns),
    ])
    return { rows, total, page: data.page, pageSize: PAGE_SIZE, today: clock.today() }
  })

export const runBillingNow = createServerFn({ method: 'POST' })
  .validator(runBillingSchema)
  .handler(async ({ data }): Promise<ActionResult<Awaited<ReturnType<typeof runBilling>>>> => {
    const user = await requireRole('admin', 'staff')
    return { ok: true, data: await runBilling(db, { asOf: data.asOf, triggeredBy: user.id }) }
  })
