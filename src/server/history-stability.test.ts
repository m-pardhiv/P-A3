import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  customers,
  invoiceLines,
  invoices,
  plans,
  subscriptionLines,
  subscriptions,
  taxRules,
} from '~/db/schema'
import {
  addPlan,
  addSubscription,
  assertTestDatabase,
  baseData,
  openTestDb,
  resetDb,
} from '~/test/helpers'
import { runBilling } from './billing-run'
import { performSubscriptionAction } from './subscription-core'

const { database, close } = openTestDb()
let data: Awaited<ReturnType<typeof baseData>>

beforeAll(() => assertTestDatabase(database))
afterAll(close)
beforeEach(async () => {
  await resetDb(database)
  data = await baseData(database)
})

describe('later changes do not rewrite what was billed', () => {
  it('keeps invoice amounts, tax and customer details when prices, tax rules or the customer change', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-03-01',
    })
    await runBilling(database, { asOf: '2026-03-01' })
    const [before] = await database
      .select()
      .from(invoices)
      .where(eq(invoices.subscriptionId, sub.id))
    const linesBefore = await database
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, before.id))

    await database.update(plans).set({ price: 999999 }).where(eq(plans.id, plan.id))
    await database.update(taxRules).set({ ratePercent: 28 })
    await database
      .update(customers)
      .set({ name: 'Renamed Ltd', email: 'new@elsewhere.example' })
      .where(eq(customers.id, data.a.customer.id))

    const [after] = await database.select().from(invoices).where(eq(invoices.id, before.id))
    const linesAfter = await database
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, before.id))
    expect(after).toMatchObject({ subtotal: 100000, taxTotal: 18000, total: 118000 })
    expect(after.customerSnapshot).toMatchObject({
      name: 'Customer A',
      email: 'customera@test.example',
    })
    expect(linesAfter).toEqual(linesBefore)
  })
})

describe('converting a quotation into a subscription', () => {
  it('is the same record, keeping its lines, prices and tax, and cannot happen twice', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-03-01',
      status: 'quotation',
    })
    await database
      .update(subscriptions)
      .set({ quotationValidUntil: '2999-01-01' })
      .where(eq(subscriptions.id, sub.id))
    const linesBefore = await database
      .select()
      .from(subscriptionLines)
      .where(eq(subscriptionLines.subscriptionId, sub.id))

    const first = await performSubscriptionAction(database, {
      id: sub.id,
      action: 'confirm',
      actorId: data.admin.id,
    })
    const second = await performSubscriptionAction(database, {
      id: sub.id,
      action: 'confirm',
      actorId: data.admin.id,
    })

    expect(first).toEqual({ ok: true, data: { id: sub.id } })
    expect(second.ok).toBe(false)
    const all = await database.select().from(subscriptions)
    expect(all).toHaveLength(1)
    expect(all[0].status).toBe('confirmed')
    expect(
      await database
        .select()
        .from(subscriptionLines)
        .where(eq(subscriptionLines.subscriptionId, sub.id)),
    ).toEqual(linesBefore)
  })

  it('cannot be confirmed once it has expired', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-03-01',
      status: 'quotation',
    })
    await database
      .update(subscriptions)
      .set({ quotationValidUntil: '2020-01-01' })
      .where(eq(subscriptions.id, sub.id))

    const result = await performSubscriptionAction(database, {
      id: sub.id,
      action: 'confirm',
      actorId: data.admin.id,
    })

    expect(result.ok).toBe(false)
  })

  it('lets only one of two simultaneous confirmations through', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-03-01',
      status: 'quotation',
    })
    await database
      .update(subscriptions)
      .set({ quotationValidUntil: '2999-01-01' })
      .where(eq(subscriptions.id, sub.id))

    const results = await Promise.all([
      performSubscriptionAction(database, {
        id: sub.id,
        action: 'confirm',
        actorId: data.admin.id,
      }),
      performSubscriptionAction(database, {
        id: sub.id,
        action: 'confirm',
        actorId: data.admin.id,
      }),
    ])

    expect(results.filter((r) => r.ok)).toHaveLength(1)
  })
})
