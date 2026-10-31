import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  addInvoice,
  addPlan,
  addSubscription,
  assertTestDatabase,
  baseData,
  openTestDb,
  resetDb,
} from '~/test/helpers'
import { getInvoice, listInvoices } from './invoice-queries'

const { database, close } = openTestDb()
let data: Awaited<ReturnType<typeof baseData>>
let invoiceA: { id: string }
let invoiceB: { id: string }

beforeAll(() => assertTestDatabase(database))
afterAll(close)
beforeEach(async () => {
  await resetDb(database)
  data = await baseData(database)
  const plan = await addPlan(database)
  const make = async (customerId: string) => {
    const sub = await addSubscription(database, {
      customerId,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
    })
    return addInvoice(database, { subscriptionId: sub.id, customerId, status: 'confirmed' })
  }
  invoiceA = await make(data.a.customer.id)
  invoiceB = await make(data.b.customer.id)
})

describe('the customer portal', () => {
  it('lets customer A open their own invoice', async () => {
    const found = await getInvoice(database, invoiceA.id, { customerId: data.a.customer.id })
    expect(found?.invoice.id).toBe(invoiceA.id)
  })

  it("does not let customer A open customer B's invoice", async () => {
    const found = await getInvoice(database, invoiceB.id, { customerId: data.a.customer.id })
    expect(found).toBeUndefined()
  })

  it('staff, with no customer scope, can open either', async () => {
    expect(await getInvoice(database, invoiceA.id)).toBeDefined()
    expect(await getInvoice(database, invoiceB.id)).toBeDefined()
  })

  it("lists only the signed-in customer's invoices", async () => {
    const list = await listInvoices(database, { page: 1 }, { customerId: data.a.customer.id })
    expect(list.rows.map((row) => row.id)).toEqual([invoiceA.id])
    expect(list.total).toBe(1)
  })

  it('hides draft invoices from the customer who owns them', async () => {
    const plan = await addPlan(database, { name: 'Weekly' })
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-02-01',
    })
    const draft = await addInvoice(database, {
      subscriptionId: sub.id,
      customerId: data.a.customer.id,
      status: 'draft',
      periodStart: '2026-02-01',
    })

    expect(await getInvoice(database, draft.id, { customerId: data.a.customer.id })).toBeUndefined()
    const list = await listInvoices(database, { page: 1 }, { customerId: data.a.customer.id })
    expect(list.rows.map((row) => row.id)).not.toContain(draft.id)
  })
})
