import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { invoices, payments } from '~/db/schema'
import {
  addInvoice,
  addPlan,
  addSubscription,
  assertTestDatabase,
  baseData,
  openTestDb,
  resetDb,
} from '~/test/helpers'
import { recordPayment } from './payments'

const { database, close } = openTestDb()
let data: Awaited<ReturnType<typeof baseData>>
let invoiceId: string

beforeAll(() => assertTestDatabase(database))
afterAll(close)
beforeEach(async () => {
  await resetDb(database)
  data = await baseData(database)
  const plan = await addPlan(database)
  const sub = await addSubscription(database, {
    customerId: data.a.customer.id,
    plan,
    termId: data.term.id,
    startDate: '2026-01-01',
  })
  invoiceId = (
    await addInvoice(database, {
      subscriptionId: sub.id,
      customerId: data.a.customer.id,
      total: 100000,
    })
  ).id
})

const pay = (amount: number, idempotencyKey?: string) =>
  recordPayment(database, {
    invoiceId,
    method: 'cash',
    amount,
    paidOn: '2026-01-05',
    note: null,
    recordedBy: data.admin.id,
    idempotencyKey,
  })

describe('submitting a payment twice', () => {
  it('records it once when the same key arrives again', async () => {
    const key = randomUUID()
    const first = await pay(30000, key)
    const second = await pay(30000, key)

    expect(second).toEqual(first)
    expect(await database.select().from(payments)).toHaveLength(1)
    const [invoice] = await database.select().from(invoices).where(eq(invoices.id, invoiceId))
    expect(invoice.amountPaid).toBe(30000)
  })

  it('records it once when two identical requests race', async () => {
    const key = randomUUID()
    const [a, b] = await Promise.all([pay(30000, key), pay(30000, key)])

    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    expect(await database.select().from(payments)).toHaveLength(1)
  })

  it('still records two real payments that have different keys', async () => {
    await pay(30000, randomUUID())
    await pay(30000, randomUUID())

    expect(await database.select().from(payments)).toHaveLength(2)
  })
})

describe('payments at the same moment', () => {
  it('cannot add up to more than the invoice total', async () => {
    const results = await Promise.all([
      pay(60000, randomUUID()),
      pay(60000, randomUUID()),
      pay(60000, randomUUID()),
    ])

    expect(results.filter((r) => r.ok)).toHaveLength(1)
    const [invoice] = await database.select().from(invoices).where(eq(invoices.id, invoiceId))
    expect(invoice.amountPaid).toBe(60000)
    expect(invoice.status).toBe('confirmed')
  })
})
