import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { discountRedemptions, discounts, invoiceLines, invoices, subscriptions } from '~/db/schema'
import {
  addInvoice,
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

const periodStarts = async (subscriptionId: string) =>
  (
    await database
      .select({ start: invoices.periodStart })
      .from(invoices)
      .where(eq(invoices.subscriptionId, subscriptionId))
      .orderBy(invoices.periodStart)
  ).map((row) => row.start)

describe('billing is idempotent', () => {
  it('creates no extra invoices when run twice for the same date', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })

    const first = await runBilling(database, { asOf: '2026-01-15' })
    const second = await runBilling(database, { asOf: '2026-01-15' })

    expect(first.created).toBe(1)
    expect(second).toMatchObject({ created: 0, skipped: 0, errors: 0 })
    expect(await periodStarts(sub.id)).toEqual(['2026-01-01'])
  })

  it('does not bill a period again when its invoice already exists', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    await addInvoice(database, {
      subscriptionId: sub.id,
      customerId: data.a.customer.id,
      status: 'confirmed',
      periodStart: '2026-01-01',
    })

    const result = await runBilling(database, { asOf: '2026-02-10' })

    expect(result).toMatchObject({ created: 1, skipped: 1 })
    expect(await periodStarts(sub.id)).toEqual(['2026-01-01', '2026-02-01'])
  })

  it('rebills a period whose invoice was cancelled, only if billing reaches it again', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    await runBilling(database, { asOf: '2026-01-01' })
    await database
      .update(invoices)
      .set({ status: 'cancelled' })
      .where(eq(invoices.subscriptionId, sub.id))

    const again = await runBilling(database, { asOf: '2026-01-20' })

    // next_invoice_date has moved past January, so a cancelled invoice is not recreated.
    expect(again.created).toBe(0)
  })
})

describe('catch-up', () => {
  it('creates exactly three invoices for three missed months', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })

    const result = await runBilling(database, { asOf: '2026-03-15' })

    expect(result.created).toBe(3)
    expect(await periodStarts(sub.id)).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
    const [after] = await database.select().from(subscriptions).where(eq(subscriptions.id, sub.id))
    expect(after.nextInvoiceDate).toBe('2026-04-01')
  })

  it('keeps a 31 January anchor correct', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-31',
    })

    await runBilling(database, { asOf: '2026-04-01' })

    expect(await periodStarts(sub.id)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    const [after] = await database.select().from(subscriptions).where(eq(subscriptions.id, sub.id))
    expect(after.nextInvoiceDate).toBe('2026-04-30')
  })

  it('stops at the expiry date and closes an auto_close plan after it', async () => {
    const plan = await addPlan(database, { autoClose: true })
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
      expiryDate: '2026-03-31',
    })

    const result = await runBilling(database, { asOf: '2026-06-30' })

    expect(result.created).toBe(3)
    expect(result.closed).toBe(1)
    const [after] = await database.select().from(subscriptions).where(eq(subscriptions.id, sub.id))
    expect(after).toMatchObject({ status: 'closed', nextInvoiceDate: null })
  })

  it('leaves a plan without auto_close active, with billing switched off', async () => {
    const plan = await addPlan(database, { autoClose: false })
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
      expiryDate: '2026-02-28',
    })

    await runBilling(database, { asOf: '2026-06-30' })

    const [after] = await database.select().from(subscriptions).where(eq(subscriptions.id, sub.id))
    expect(after).toMatchObject({ status: 'active', nextInvoiceDate: null })
  })

  it('does not close an auto_close plan before its expiry date', async () => {
    const plan = await addPlan(database, { autoClose: true })
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
      expiryDate: '2026-12-31',
    })

    await runBilling(database, { asOf: '2026-12-01' })

    const [after] = await database.select().from(subscriptions).where(eq(subscriptions.id, sub.id))
    expect(after.status).toBe('active')
  })
})

describe('which subscriptions are billed', () => {
  it('skips paused subscriptions', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
      status: 'paused',
    })
    await database
      .update(subscriptions)
      .set({ nextInvoiceDate: '2026-01-01' })
      .where(eq(subscriptions.id, sub.id))

    const result = await runBilling(database, { asOf: '2026-06-01' })

    expect(result.created).toBe(0)
  })

  it('activates a confirmed subscription whose start date has arrived, and bills it', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-02-01',
      status: 'confirmed',
    })

    const early = await runBilling(database, { asOf: '2026-01-31' })
    expect(early).toMatchObject({ activated: 0, created: 0 })

    const result = await runBilling(database, { asOf: '2026-02-01' })
    expect(result).toMatchObject({ activated: 1, created: 1 })
    const [after] = await database.select().from(subscriptions).where(eq(subscriptions.id, sub.id))
    expect(after.status).toBe('active')
  })

  it('skips draft, quotation and closed subscriptions', async () => {
    const plan = await addPlan(database)
    for (const status of ['draft', 'quotation', 'closed'] as const) {
      await addSubscription(database, {
        customerId: data.a.customer.id,
        plan,
        termId: data.term.id,
        startDate: '2026-01-01',
        status,
      })
    }
    expect((await runBilling(database, { asOf: '2026-06-01' })).created).toBe(0)
  })
})

describe('what an invoice contains', () => {
  it('copies the lines, resolves tax per line, and starts as a draft', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
      quantity: 2,
    })

    await runBilling(database, { asOf: '2026-01-01' })

    const [invoice] = await database
      .select()
      .from(invoices)
      .where(eq(invoices.subscriptionId, sub.id))
    expect(invoice).toMatchObject({
      status: 'draft',
      subtotal: 200000,
      taxTotal: 36000,
      total: 236000,
      issueDate: '2026-01-01',
      dueDate: '2026-01-16',
      customerSnapshot: expect.objectContaining({ name: 'Customer A' }),
    })
    expect(invoice.number).toMatch(/^INV-\d{5}$/)
    const lines = await database
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoice.id))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({
      quantity: 2,
      unitPrice: 100000,
      taxAmount: 36000,
      amount: 200000,
    })
  })

  it('records the run, with its counts', async () => {
    const plan = await addPlan(database)
    await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    const result = await runBilling(database, { asOf: '2026-02-01', triggeredBy: data.admin.id })
    expect(result).toMatchObject({ created: 2, skipped: 0, errors: 0 })
  })
})

describe('discounts', () => {
  const tenPercent = {
    name: 'Launch 10%',
    kind: 'percent' as const,
    value: 10,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    usageLimit: 1,
    scope: 'subscription' as const,
  }

  it('adds a negative line and counts one redemption', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-02-01',
    })
    const [discount] = await database
      .insert(discounts)
      .values({ ...tenPercent, usageLimit: 5 })
      .returning()

    await runBilling(database, { asOf: '2026-02-01' })

    const [invoice] = await database
      .select()
      .from(invoices)
      .where(eq(invoices.subscriptionId, sub.id))
    const lines = await database
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoice.id))
    expect(lines.find((l) => l.amount < 0)).toMatchObject({
      description: 'Discount: Launch 10%',
      amount: -10000,
    })
    expect(invoice).toMatchObject({
      subtotal: 100000,
      discountTotal: 10000,
      taxTotal: 16200,
      total: 106200,
    })
    const [after] = await database.select().from(discounts).where(eq(discounts.id, discount.id))
    expect(after.usedCount).toBe(1)
    const redemptions = await database
      .select()
      .from(discountRedemptions)
      .where(and(eq(discountRedemptions.discountId, discount.id)))
    expect(redemptions).toHaveLength(1)
  })

  it('stops once the usage limit is reached', async () => {
    const plan = await addPlan(database)
    for (const customer of [data.a.customer, data.b.customer]) {
      await addSubscription(database, {
        customerId: customer.id,
        plan,
        termId: data.term.id,
        startDate: '2026-02-01',
      })
    }
    const [discount] = await database.insert(discounts).values(tenPercent).returning()

    const result = await runBilling(database, { asOf: '2026-02-01' })

    expect(result.created).toBe(2)
    const withDiscount = await database
      .select()
      .from(invoices)
      .where(eq(invoices.discountTotal, 10000))
    expect(withDiscount).toHaveLength(1)
    const [after] = await database.select().from(discounts).where(eq(discounts.id, discount.id))
    expect(after.usedCount).toBe(1)
  })

  it('does not apply an expired discount', async () => {
    const plan = await addPlan(database)
    await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-02-01',
    })
    const [discount] = await database
      .insert(discounts)
      .values({ ...tenPercent, endDate: '2026-01-31' })
      .returning()

    await runBilling(database, { asOf: '2026-02-01' })

    const [after] = await database.select().from(discounts).where(eq(discounts.id, discount.id))
    expect(after.usedCount).toBe(0)
  })

  it('does not count a use when the invoice already existed', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-02-01',
    })
    await addInvoice(database, {
      subscriptionId: sub.id,
      customerId: data.a.customer.id,
      periodStart: '2026-02-01',
    })
    const [discount] = await database.insert(discounts).values(tenPercent).returning()

    const result = await runBilling(database, { asOf: '2026-02-01' })

    expect(result).toMatchObject({ created: 0, skipped: 1 })
    const [after] = await database.select().from(discounts).where(eq(discounts.id, discount.id))
    expect(after.usedCount).toBe(0)
  })
})
