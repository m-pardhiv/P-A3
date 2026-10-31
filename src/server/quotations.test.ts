import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscriptions } from '~/db/schema'
import {
  addPlan,
  addSubscription,
  assertTestDatabase,
  baseData,
  openTestDb,
  resetDb,
} from '~/test/helpers'
import { clock } from './clock'
import { addDays } from './domain/dates'
import { getQuotation, sendQuotation } from './quotations'
import { listSubscriptionEvents } from './subscription-events'

const { database, close } = openTestDb()
let data: Awaited<ReturnType<typeof baseData>>

beforeAll(() => assertTestDatabase(database))
afterAll(close)
beforeEach(async () => {
  await resetDb(database)
  data = await baseData(database)
})

async function quotation(validUntil: string | null, status: 'quotation' | 'draft' = 'quotation') {
  const plan = await addPlan(database)
  const sub = await addSubscription(database, {
    customerId: data.a.customer.id,
    plan,
    termId: data.term.id,
    startDate: addDays(clock.today(), 7),
    status,
  })
  await database
    .update(subscriptions)
    .set({ quotationValidUntil: validUntil })
    .where(eq(subscriptions.id, sub.id))
  return sub
}

describe('quotations', () => {
  it('shows lines, tax and totals for the customer', async () => {
    const sub = await quotation(addDays(clock.today(), 10))

    const found = await getQuotation(database, sub.id)

    expect(found?.quotation).toMatchObject({
      number: 'SUB-00001',
      expired: false,
      planName: 'Monthly',
    })
    expect(found?.totals).toEqual({ subtotal: 100000, tax: 18000, total: 118000 })
  })

  it('flags an expired quotation', async () => {
    const sub = await quotation(addDays(clock.today(), -1))
    expect((await getQuotation(database, sub.id))?.quotation.expired).toBe(true)
  })

  it('emails a valid quotation, stamps when, and records it in the history', async () => {
    const sub = await quotation(addDays(clock.today(), 10))
    const mail = vi.fn().mockResolvedValue(undefined)

    const result = await sendQuotation(database, { id: sub.id, actorId: data.admin.id }, mail)

    expect(result).toEqual({ ok: true, data: { to: 'customera@test.example' } })
    expect(mail.mock.calls[0][0].text).toContain('Total each period: ₹1,180.00')
    const [after] = await database.select().from(subscriptions).where(eq(subscriptions.id, sub.id))
    expect(after.quotationSentAt).not.toBeNull()
    const history = await listSubscriptionEvents(database, sub.id)
    expect(history.map((e) => e.action)).toContain('quotation_emailed')
  })

  it('will not email an expired quotation, a draft, or when the mail fails', async () => {
    const mail = vi.fn().mockResolvedValue(undefined)
    const expired = await quotation(addDays(clock.today(), -1))
    expect(
      (await sendQuotation(database, { id: expired.id, actorId: data.admin.id }, mail)).ok,
    ).toBe(false)

    const draft = await quotation(null, 'draft')
    expect((await sendQuotation(database, { id: draft.id, actorId: data.admin.id }, mail)).ok).toBe(
      false,
    )
    expect(mail).not.toHaveBeenCalled()

    const live = await quotation(addDays(clock.today(), 5))
    const broken = vi.fn().mockRejectedValue(new Error('SMTP down'))
    const failed = await sendQuotation(database, { id: live.id, actorId: data.admin.id }, broken)
    expect(failed.ok).toBe(false)
    const [row] = await database.select().from(subscriptions).where(eq(subscriptions.id, live.id))
    expect(row.quotationSentAt).toBeNull()
  })

  it('shows a customer only their own quotation, and never a draft', async () => {
    const mine = await quotation(addDays(clock.today(), 10))
    const draft = await quotation(null, 'draft')

    expect(await getQuotation(database, mine.id, { customerId: data.a.customer.id })).toBeDefined()
    expect(
      await getQuotation(database, mine.id, { customerId: data.b.customer.id }),
    ).toBeUndefined()
    expect(
      await getQuotation(database, draft.id, { customerId: data.a.customer.id }),
    ).toBeUndefined()
  })
})
