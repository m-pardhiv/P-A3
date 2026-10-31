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
import { applyPayment } from './domain/payment'
import { recordPayment } from './payments'

describe('applyPayment', () => {
  const invoice = { status: 'confirmed' as const, total: 100000, amountPaid: 0 }

  it('keeps the invoice confirmed after a partial payment', () => {
    expect(applyPayment(invoice, 40000)).toEqual({
      ok: true,
      amountPaid: 40000,
      status: 'confirmed',
    })
  })

  it('marks the invoice paid when the payments cover the total', () => {
    expect(applyPayment(invoice, 100000)).toEqual({ ok: true, amountPaid: 100000, status: 'paid' })
    expect(applyPayment({ ...invoice, amountPaid: 40000 }, 60000)).toEqual({
      ok: true,
      amountPaid: 100000,
      status: 'paid',
    })
  })

  it('rejects an overpayment', () => {
    expect(applyPayment(invoice, 100001).ok).toBe(false)
    expect(applyPayment({ ...invoice, amountPaid: 40000 }, 60001).ok).toBe(false)
  })

  it('rejects a payment on anything but a confirmed invoice', () => {
    for (const status of ['draft', 'paid', 'cancelled'] as const) {
      expect(applyPayment({ ...invoice, status }, 1000).ok).toBe(false)
    }
  })

  it('rejects zero, negative and fractional amounts', () => {
    for (const amount of [0, -5, 10.5]) expect(applyPayment(invoice, amount).ok).toBe(false)
  })
})

describe('recordPayment', () => {
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
    const invoice = await addInvoice(database, {
      subscriptionId: sub.id,
      customerId: data.a.customer.id,
      status: 'confirmed',
      total: 100000,
    })
    invoiceId = invoice.id
  })

  const pay = (amount: number, paidOn = '2026-01-05') =>
    recordPayment(database, {
      invoiceId,
      method: 'upi',
      amount,
      paidOn,
      note: null,
      recordedBy: data.admin.id,
    })

  const invoice = async () =>
    (await database.select().from(invoices).where(eq(invoices.id, invoiceId)))[0]

  it('a partial payment keeps the invoice confirmed and updates amount_paid', async () => {
    const result = await pay(40000)

    expect(result).toEqual({ ok: true, data: { status: 'confirmed', amountPaid: 40000 } })
    expect(await invoice()).toMatchObject({ status: 'confirmed', amountPaid: 40000 })
  })

  it('paying the full amount flips the invoice to paid', async () => {
    await pay(40000)
    await pay(60000)

    expect(await invoice()).toMatchObject({ status: 'paid', amountPaid: 100000 })
    expect(await database.select().from(payments)).toHaveLength(2)
  })

  it('rejects an overpayment and records nothing', async () => {
    const result = await pay(100001)

    expect(result).toMatchObject({ ok: false, fieldErrors: { amount: expect.any(String) } })
    expect(await invoice()).toMatchObject({ status: 'confirmed', amountPaid: 0 })
    expect(await database.select().from(payments)).toHaveLength(0)
  })

  it('rejects a payment on a draft invoice', async () => {
    await database.update(invoices).set({ status: 'draft' }).where(eq(invoices.id, invoiceId))
    expect((await pay(1000)).ok).toBe(false)
    expect(await database.select().from(payments)).toHaveLength(0)
  })

  it('rejects a payment dated before the invoice', async () => {
    const result = await pay(1000, '2025-12-31')
    expect(result).toMatchObject({ ok: false, fieldErrors: { paidOn: expect.any(String) } })
  })

  it('rejects a payment dated in the future', async () => {
    const result = await pay(1000, '2999-01-01')
    expect(result).toMatchObject({ ok: false, fieldErrors: { paidOn: expect.any(String) } })
  })

  it('two payments at once cannot overpay the invoice', async () => {
    const results = await Promise.all([pay(70000), pay(70000)])

    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect((await invoice()).amountPaid).toBe(70000)
  })
})
