import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { payments } from '~/db/schema'
import type { DashboardFilters } from '~/shared/schemas/dashboard'
import {
  addInvoice,
  addPlan,
  addSubscription,
  assertTestDatabase,
  baseData,
  openTestDb,
  resetDb,
} from '~/test/helpers'
import {
  getInvoicesTable,
  getOverdueTable,
  getPaymentsTable,
  getSubscriptionsTable,
  getSummary,
} from './dashboard'

const { database, close } = openTestDb()

// The filters arrive from the URL with every key present, so the tests do the same.
type Filters = Partial<DashboardFilters>
const open = (f: Filters = {}): DashboardFilters => ({ from: undefined, to: undefined, ...f })
const summaryOf = (f: Filters = {}) => getSummary(database, open(f))
const invoicesTable = (f: Filters, page: number) => getInvoicesTable(database, open(f), page)
const overdueTable = (f: Filters, page: number) => getOverdueTable(database, open(f), page)
const paymentsTable = (f: Filters, page: number) => getPaymentsTable(database, open(f), page)
const subscriptionsTable = (f: Filters, page: number) =>
  getSubscriptionsTable(database, open(f), page)
let data: Awaited<ReturnType<typeof baseData>>
let monthly: Awaited<ReturnType<typeof addPlan>>
let yearly: Awaited<ReturnType<typeof addPlan>>

beforeAll(() => assertTestDatabase(database))
afterAll(close)
afterEach(() => vi.useRealTimers())

/**
 * Today is fixed at 15 March 2026. Money, in paise:
 *   - active monthly 100000 and active yearly 1200000 (100000 a month) and a paused one that must not count
 *   - A: overdue 40 days, 118000 billed, 18000 paid, 100000 owed
 *   - A: overdue 70 days, 50000 owed
 *   - B: confirmed and not yet due, 118000 owed
 *   - B: paid, and a draft
 */
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-03-15T06:00:00Z'))
  await resetDb(database)
  data = await baseData(database)
  monthly = await addPlan(database, { name: 'Monthly' })
  yearly = await addPlan(database, { name: 'Yearly', billingPeriod: 'yearly', price: 1200000 })

  const subA = await addSubscription(database, {
    customerId: data.a.customer.id,
    plan: monthly,
    termId: data.term.id,
    startDate: '2026-01-01',
  })
  const subB = await addSubscription(database, {
    customerId: data.b.customer.id,
    plan: yearly,
    termId: data.term.id,
    startDate: '2026-01-01',
  })
  await addSubscription(database, {
    customerId: data.b.customer.id,
    plan: monthly,
    termId: data.term.id,
    startDate: '2026-01-01',
    status: 'paused',
  })

  const overdue40 = await addInvoice(database, {
    subscriptionId: subA.id,
    customerId: data.a.customer.id,
    total: 118000,
    amountPaid: 18000,
    periodStart: '2026-02-03',
  })
  await addInvoice(database, {
    subscriptionId: subA.id,
    customerId: data.a.customer.id,
    total: 50000,
    periodStart: '2026-01-04',
  })
  await addInvoice(database, {
    subscriptionId: subB.id,
    customerId: data.b.customer.id,
    total: 118000,
    periodStart: '2026-03-20',
  })
  const paid = await addInvoice(database, {
    subscriptionId: subB.id,
    customerId: data.b.customer.id,
    status: 'paid',
    total: 60000,
    amountPaid: 60000,
    periodStart: '2026-02-20',
  })
  await addInvoice(database, {
    subscriptionId: subB.id,
    customerId: data.b.customer.id,
    status: 'draft',
    total: 70000,
    periodStart: '2026-03-01',
  })

  await database.insert(payments).values([
    {
      invoiceId: overdue40.id,
      method: 'upi',
      amount: 18000,
      paidOn: '2026-03-01',
      recordedBy: data.admin.id,
    },
    {
      invoiceId: paid.id,
      method: 'cash',
      amount: 60000,
      paidOn: '2026-01-10',
      recordedBy: data.admin.id,
    },
  ])
})

describe('dashboard summary matches the records', () => {
  it('counts only active subscriptions, and scales each to a month', async () => {
    const summary = await summaryOf({})

    expect(summary.activeSubscriptions).toBe(2)
    expect(summary.mrr).toBe(100000 + 100000)
  })

  it('adds up what is owed and what is overdue, on confirmed invoices only', async () => {
    const summary = await summaryOf({})

    expect(summary.outstanding).toBe(100000 + 50000 + 118000)
    expect(summary.overdueCount).toBe(2)
    expect(summary.overdueAmount).toBe(150000)
  })

  it('puts each overdue amount in the right ageing bucket', async () => {
    const { ageing } = await summaryOf({})

    expect(ageing).toEqual([
      { label: '1 to 30 days', count: 0, amount: 0 },
      { label: '31 to 60 days', count: 1, amount: 100000 },
      { label: '61 days or more', count: 1, amount: 50000 },
    ])
  })

  it('counts revenue inside the date range only, 30 days back by default', async () => {
    expect((await summaryOf({})).revenue).toBe(18000)
    expect((await summaryOf({ from: '2026-01-01', to: '2026-03-15' })).revenue).toBe(78000)
    expect((await summaryOf({ from: '2026-01-01', to: '2026-01-31' })).revenue).toBe(60000)
  })

  it('treats the range ends as included, and swaps a backwards range into one day', async () => {
    expect((await summaryOf({ from: '2026-03-01', to: '2026-03-01' })).revenue).toBe(18000)
    const backwards = await summaryOf({ from: '2026-03-10', to: '2026-03-01' })
    expect(backwards.from).toBe('2026-03-01')
  })
})

describe('dashboard filters', () => {
  it('narrows every number to one customer', async () => {
    const summary = await summaryOf({ customerId: data.b.customer.id })

    expect(summary.activeSubscriptions).toBe(1)
    expect(summary.outstanding).toBe(118000)
    expect(summary.overdueCount).toBe(0)
    expect(summary.revenue).toBe(0)
  })

  it('narrows every number to one plan', async () => {
    const summary = await summaryOf({ planId: yearly.id, from: '2026-01-01' })

    expect(summary.activeSubscriptions).toBe(1)
    expect(summary.mrr).toBe(100000)
    expect(summary.revenue).toBe(60000)
  })

  it('filters the subscriptions table by status', async () => {
    const paused = await subscriptionsTable({ status: 'paused' }, 1)
    const all = await subscriptionsTable({}, 1)

    expect(paused.total).toBe(1)
    expect(all.total).toBe(3)
  })

  it('filters the invoices table by invoice status, including overdue', async () => {
    expect((await invoicesTable({}, 1)).total).toBe(5)
    expect((await invoicesTable({ invoiceStatus: 'draft' }, 1)).total).toBe(1)
    expect((await invoicesTable({ invoiceStatus: 'paid' }, 1)).total).toBe(1)
    expect((await invoicesTable({ invoiceStatus: 'confirmed' }, 1)).total).toBe(3)
    const overdue = await invoicesTable({ invoiceStatus: 'overdue' }, 1)
    expect(overdue.total).toBe(2)
    expect(overdue.rows.every((row) => row.overdue)).toBe(true)
  })

  it('applies the date range to the issue date, only when one is chosen', async () => {
    const march = await invoicesTable({ from: '2026-03-01', to: '2026-03-31' }, 1)
    expect(march.total).toBe(2)
    expect((await invoicesTable({ customerId: data.a.customer.id }, 1)).total).toBe(2)
  })
})

describe('dashboard tables', () => {
  it('lists the oldest overdue invoice first, with its age', async () => {
    const overdue = await overdueTable({}, 1)

    expect(overdue.total).toBe(2)
    expect(overdue.rows.map((row) => row.daysOverdue)).toEqual([70, 40])
    expect(overdue.rows.every((row) => row.reminders === 0)).toBe(true)
  })

  it('lists payments in the range with the invoice and customer', async () => {
    const recent = await paymentsTable({}, 1)

    expect(recent.total).toBe(1)
    expect(recent.rows[0]).toMatchObject({
      amount: 18000,
      method: 'upi',
      customerName: 'Customer A',
    })
  })

  it('paginates by 20 and reports the page it is on', async () => {
    const page = await invoicesTable({}, 2)

    expect(page.pageSize).toBe(20)
    expect(page.page).toBe(2)
    expect(page.rows).toHaveLength(0)
    expect(page.total).toBe(5)
  })
})
