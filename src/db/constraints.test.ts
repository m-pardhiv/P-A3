import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { isUniqueViolation } from '~/db/errors'
import { discounts, invoices, payments, subscriptions, taxRules, users } from '~/db/schema'
import {
  addInvoice,
  addPlan,
  addSubscription,
  assertTestDatabase,
  baseData,
  openTestDb,
  resetDb,
} from '~/test/helpers'

const { database, close } = openTestDb()
let data: Awaited<ReturnType<typeof baseData>>

beforeAll(() => assertTestDatabase(database))
afterAll(close)
beforeEach(async () => {
  await resetDb(database)
  data = await baseData(database)
})

/** The database refuses bad data even if the application layer is bypassed. */
async function rejects(promise: PromiseLike<unknown>) {
  let failure: unknown
  try {
    await promise
  } catch (error) {
    failure = error
  }
  expect(failure).toBeDefined()
  return failure
}

describe('uniqueness', () => {
  it('allows one active default tax rule', async () => {
    const failure = await rejects(
      database.insert(taxRules).values({ name: 'Second default', ratePercent: 5, isDefault: true }),
    )
    expect(isUniqueViolation(failure)).toBe(true)
  })

  it('lets an inactive rule share the default flag, and any number of non-defaults', async () => {
    await database
      .insert(taxRules)
      .values({ name: 'Old default', ratePercent: 5, isDefault: true, active: false })
    await database
      .insert(taxRules)
      .values({ name: 'Training', ratePercent: 5, productType: 'training' })
    expect(await database.select().from(taxRules)).toHaveLength(3)
  })

  it('treats an email as the same whatever its case', async () => {
    const failure = await rejects(
      database
        .insert(users)
        .values({ email: 'ADMIN@test.example', passwordHash: 'x', role: 'staff', name: 'Dup' }),
    )
    expect(isUniqueViolation(failure)).toBe(true)
  })

  it('gives every subscription and invoice its own number', async () => {
    const plan = await addPlan(database)
    const a = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    const b = await addSubscription(database, {
      customerId: data.b.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    expect([a.number, b.number]).toEqual(['SUB-00001', 'SUB-00002'])

    const i1 = await addInvoice(database, { subscriptionId: a.id, customerId: data.a.customer.id })
    const i2 = await addInvoice(database, { subscriptionId: b.id, customerId: data.b.customer.id })
    expect([i1.number, i2.number]).toEqual(['INV-00001', 'INV-00002'])
    const failure = await rejects(
      database.update(invoices).set({ number: i1.number }).where(eq(invoices.id, i2.id)),
    )
    expect(isUniqueViolation(failure)).toBe(true)
  })

  it('allows one live invoice per subscription period, and a new one after a cancellation', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    const first = await addInvoice(database, {
      subscriptionId: sub.id,
      customerId: data.a.customer.id,
    })

    const failure = await rejects(
      addInvoice(database, { subscriptionId: sub.id, customerId: data.a.customer.id }),
    )
    expect(isUniqueViolation(failure)).toBe(true)

    await database.update(invoices).set({ status: 'cancelled' }).where(eq(invoices.id, first.id))
    await addInvoice(database, { subscriptionId: sub.id, customerId: data.a.customer.id })
  })

  it('allows a subscription to be renewed only once', async () => {
    const plan = await addPlan(database)
    const original = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    const make = () =>
      database.insert(subscriptions).values({
        customerId: data.a.customer.id,
        planId: plan.id,
        paymentTermId: data.term.id,
        startDate: '2027-01-01',
        renewedFromId: original.id,
      })
    await make()
    expect(isUniqueViolation(await rejects(make()))).toBe(true)
  })
})

describe('checks', () => {
  it('keeps money non-negative and payments within the invoice', async () => {
    const plan = await addPlan(database)
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    const invoice = await addInvoice(database, {
      subscriptionId: sub.id,
      customerId: data.a.customer.id,
      total: 100000,
    })

    await rejects(
      database.update(invoices).set({ amountPaid: 100001 }).where(eq(invoices.id, invoice.id)),
    )
    await rejects(database.update(invoices).set({ total: -1 }).where(eq(invoices.id, invoice.id)))
    await rejects(
      database.insert(payments).values({
        invoiceId: invoice.id,
        method: 'cash',
        amount: 0,
        paidOn: '2026-01-02',
        recordedBy: data.admin.id,
      }),
    )
  })

  it('keeps quantities positive and dates in order', async () => {
    const plan = await addPlan(database)
    await rejects(addPlan(database, { minQuantity: 0 }))
    await rejects(addPlan(database, { availableFrom: '2026-02-01', availableTo: '2026-01-01' }))
    await rejects(
      addSubscription(database, {
        customerId: data.a.customer.id,
        plan,
        termId: data.term.id,
        startDate: '2026-02-01',
        expiryDate: '2026-01-01',
      }),
    )
  })

  it('stops a discount being used more than its limit', async () => {
    await rejects(
      database.insert(discounts).values({
        name: 'Over used',
        kind: 'percent',
        value: 10,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        usageLimit: 1,
        usedCount: 2,
        scope: 'subscription',
      }),
    )
  })

  it('refuses a missing required field', async () => {
    await rejects(
      database.execute(
        sql`insert into users (email, role, name) values ('x@test.example', 'staff', 'No Password')`,
      ),
    )
  })
})
