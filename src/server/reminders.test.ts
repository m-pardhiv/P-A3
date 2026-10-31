import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { invoices, paymentReminders } from '~/db/schema'
import {
  addInvoice,
  addPlan,
  addSubscription,
  assertTestDatabase,
  baseData,
  openTestDb,
  resetDb,
} from '~/test/helpers'
import { listReminders, sendPaymentReminder } from './reminders'

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
  // Issued and due on 1 January 2026, so it is long overdue.
  invoiceId = (
    await addInvoice(database, { subscriptionId: sub.id, customerId: data.a.customer.id })
  ).id
})

const remind = (mail = vi.fn().mockResolvedValue(undefined)) => ({
  mail,
  run: () => sendPaymentReminder(database, { invoiceId, sentBy: data.admin.id }, mail),
})

describe('payment reminders', () => {
  it('emails the customer about an overdue invoice and keeps a record', async () => {
    const { mail, run } = remind()

    const result = await run()

    expect(result).toEqual({ ok: true, data: { to: 'customera@test.example' } })
    expect(mail).toHaveBeenCalledTimes(1)
    expect(mail.mock.calls[0][0]).toMatchObject({
      to: 'customera@test.example',
      subject: expect.stringContaining('overdue'),
    })
    const history = await listReminders(database, invoiceId)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ delivered: true, sentByName: 'Admin', error: null })
  })

  it('does not send a second reminder on the same day', async () => {
    const { mail, run } = remind()
    await run()

    const again = await run()

    expect(again).toMatchObject({ ok: false, error: expect.stringContaining('already sent today') })
    expect(mail).toHaveBeenCalledTimes(1)
  })

  it('records a failed send, says so, and allows a retry', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('SMTP down'))
    const first = await remind(failing).run()

    expect(first).toMatchObject({ ok: false, error: expect.stringContaining('could not be sent') })
    const [failed] = await listReminders(database, invoiceId)
    expect(failed).toMatchObject({ delivered: false, error: 'SMTP down' })

    const retry = await remind().run()
    expect(retry.ok).toBe(true)
    expect(await listReminders(database, invoiceId)).toHaveLength(2)
  })

  it('refuses an invoice that is not overdue', async () => {
    await database
      .update(invoices)
      .set({
        issueDate: '2999-01-01',
        dueDate: '2999-01-01',
        periodStart: '2999-01-01',
        periodEnd: '2999-01-01',
      })
      .where(eq(invoices.id, invoiceId))
    const { mail, run } = remind()

    expect((await run()).ok).toBe(false)
    expect(mail).not.toHaveBeenCalled()
  })

  it('refuses a paid, draft or cancelled invoice', async () => {
    for (const status of ['paid', 'draft', 'cancelled'] as const) {
      await database
        .update(invoices)
        .set({ status, amountPaid: status === 'paid' ? 118000 : 0 })
        .where(eq(invoices.id, invoiceId))
      const { mail, run } = remind()

      expect((await run()).ok, status).toBe(false)
      expect(mail).not.toHaveBeenCalled()
    }
    expect(await database.select().from(paymentReminders)).toHaveLength(0)
  })

  it('reports a missing invoice', async () => {
    const result = await sendPaymentReminder(
      database,
      { invoiceId: '00000000-0000-4000-8000-000000000000', sentBy: data.admin.id },
      vi.fn(),
    )
    expect(result.ok).toBe(false)
  })
})
