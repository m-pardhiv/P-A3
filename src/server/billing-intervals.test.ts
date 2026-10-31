import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  discountRedemptions,
  discounts,
  invoiceLines,
  invoices,
  paymentTerms,
  subscriptions,
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

const { database, close } = openTestDb()
let data: Awaited<ReturnType<typeof baseData>>

beforeAll(() => assertTestDatabase(database))
afterAll(close)
beforeEach(async () => {
  await resetDb(database)
  data = await baseData(database)
})

const starts = async (subscriptionId: string) =>
  (
    await database
      .select({ start: invoices.periodStart })
      .from(invoices)
      .where(eq(invoices.subscriptionId, subscriptionId))
      .orderBy(invoices.periodStart)
  ).map((row) => row.start)

const nextDate = async (subscriptionId: string) =>
  (
    await database
      .select({ next: subscriptions.nextInvoiceDate })
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
  )[0].next

describe('every billing interval is billed, with none skipped', () => {
  const asOf = '2026-03-01'
  const cases = [
    {
      period: 'daily' as const,
      start: '2026-02-26',
      expected: ['2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01'],
      next: '2026-03-02',
    },
    {
      period: 'weekly' as const,
      start: '2026-02-01',
      expected: ['2026-02-01', '2026-02-08', '2026-02-15', '2026-02-22', '2026-03-01'],
      next: '2026-03-08',
    },
    {
      period: 'monthly' as const,
      start: '2026-01-01',
      expected: ['2026-01-01', '2026-02-01', '2026-03-01'],
      next: '2026-04-01',
    },
    {
      period: 'yearly' as const,
      start: '2024-03-01',
      expected: ['2024-03-01', '2025-03-01', '2026-03-01'],
      next: '2027-03-01',
    },
  ]

  for (const { period, start, expected, next } of cases) {
    it(`bills a ${period} plan period by period and moves the next date on`, async () => {
      const plan = await addPlan(database, { billingPeriod: period, name: `Plan ${period}` })
      const sub = await addSubscription(database, {
        customerId: data.a.customer.id,
        plan,
        termId: data.term.id,
        startDate: start,
      })

      const result = await runBilling(database, { asOf })

      expect(result.errors).toBe(0)
      expect(await starts(sub.id)).toEqual(expected)
      expect(await nextDate(sub.id)).toBe(next)
    })

    it(`does not bill a ${period} plan again on a second run`, async () => {
      const plan = await addPlan(database, { billingPeriod: period, name: `Plan ${period}` })
      const sub = await addSubscription(database, {
        customerId: data.a.customer.id,
        plan,
        termId: data.term.id,
        startDate: start,
      })

      await runBilling(database, { asOf })
      const second = await runBilling(database, { asOf })

      expect(second.created).toBe(0)
      expect(await starts(sub.id)).toHaveLength(expected.length)
    })
  }
})

describe('billing at the same moment', () => {
  it('two simultaneous runs create each invoice once', async () => {
    const plan = await addPlan(database)
    const subs = []
    for (const customer of [data.a.customer, data.b.customer]) {
      subs.push(
        await addSubscription(database, {
          customerId: customer.id,
          plan,
          termId: data.term.id,
          startDate: '2026-01-01',
        }),
      )
    }

    await Promise.all([
      runBilling(database, { asOf: '2026-03-01' }),
      runBilling(database, { asOf: '2026-03-01' }),
    ])

    for (const sub of subs) {
      expect(await starts(sub.id)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
    }
  })

  it('a discount with one use left is used once, however many runs race', async () => {
    const plan = await addPlan(database)
    for (const customer of [data.a.customer, data.b.customer]) {
      await addSubscription(database, {
        customerId: customer.id,
        plan,
        termId: data.term.id,
        startDate: '2026-03-01',
      })
    }
    const [discount] = await database
      .insert(discounts)
      .values({
        name: 'One time',
        kind: 'percent',
        value: 10,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        usageLimit: 1,
        scope: 'subscription',
      })
      .returning()

    await Promise.all([
      runBilling(database, { asOf: '2026-03-01' }),
      runBilling(database, { asOf: '2026-03-01' }),
      runBilling(database, { asOf: '2026-03-01' }),
    ])

    const [after] = await database.select().from(discounts).where(eq(discounts.id, discount.id))
    expect(after.usedCount).toBe(1)
    expect(
      await database
        .select()
        .from(discountRedemptions)
        .where(eq(discountRedemptions.discountId, discount.id)),
    ).toHaveLength(1)

    const all = await database.select().from(invoices)
    expect(all).toHaveLength(2)
    const discounted = await database
      .select()
      .from(invoiceLines)
      .where(and(eq(invoiceLines.description, 'Discount: One time')))
    expect(discounted).toHaveLength(1)
    expect(all.filter((invoice) => invoice.discountTotal > 0)).toHaveLength(1)
  })
})

describe('a failure while billing', () => {
  it('leaves that subscription untouched, bills the others, and can be retried', async () => {
    const plan = await addPlan(database)
    const good = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-03-01',
    })
    // A due date so far away that it cannot be worked out, which makes the invoice fail.
    const [badTerm] = await database
      .insert(paymentTerms)
      .values({ name: 'Broken', daysDue: 2_000_000_000 })
      .returning()
    const bad = await addSubscription(database, {
      customerId: data.b.customer.id,
      plan,
      termId: badTerm.id,
      startDate: '2026-03-01',
    })

    const first = await runBilling(database, { asOf: '2026-03-01' })

    expect(first).toMatchObject({ created: 1, errors: 1 })
    expect(await starts(good.id)).toEqual(['2026-03-01'])
    expect(await starts(bad.id)).toEqual([])
    expect(await nextDate(bad.id)).toBe('2026-03-01')

    await database.update(paymentTerms).set({ daysDue: 15 }).where(eq(paymentTerms.id, badTerm.id))
    const retry = await runBilling(database, { asOf: '2026-03-01' })

    expect(retry).toMatchObject({ created: 1, errors: 0 })
    expect(await starts(bad.id)).toEqual(['2026-03-01'])
    expect(await starts(good.id)).toEqual(['2026-03-01'])
  })
})
