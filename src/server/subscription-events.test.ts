import { addMonths, format, parseISO } from 'date-fns'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { subscriptions } from '~/db/schema'
import {
  addPlan,
  addSubscription,
  assertTestDatabase,
  baseData,
  openTestDb,
  resetDb,
} from '~/test/helpers'
import { runBilling } from './billing-run'
import { clock } from './clock'
import { performSubscriptionAction } from './subscription-core'
import { listSubscriptionEvents } from './subscription-events'

const { database, close } = openTestDb()
let data: Awaited<ReturnType<typeof baseData>>

beforeAll(() => assertTestDatabase(database))
afterAll(close)
beforeEach(async () => {
  await resetDb(database)
  data = await baseData(database)
})

const history = async (id: string) =>
  (await listSubscriptionEvents(database, id)).map((e) => [e.action, e.fromStatus, e.toStatus])

describe('subscription history', () => {
  it('records each move with who made it', async () => {
    const plan = await addPlan(database, { pausable: true })
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
      status: 'confirmed',
    })

    await performSubscriptionAction(database, {
      id: sub.id,
      action: 'activate',
      actorId: data.admin.id,
    })
    await performSubscriptionAction(database, {
      id: sub.id,
      action: 'pause',
      actorId: data.admin.id,
    })
    await performSubscriptionAction(database, {
      id: sub.id,
      action: 'resume',
      actorId: data.admin.id,
    })

    expect(await history(sub.id)).toEqual([
      ['activate', 'confirmed', 'active'],
      ['pause', 'active', 'paused'],
      ['resume', 'paused', 'active'],
    ])
    const events = await listSubscriptionEvents(database, sub.id)
    expect(events[0].actorName).toBe('Admin')
  })

  it('records nothing for a move the rules refuse', async () => {
    const plan = await addPlan(database, { pausable: false })
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
      status: 'active',
    })

    const result = await performSubscriptionAction(database, {
      id: sub.id,
      action: 'pause',
      actorId: data.admin.id,
    })

    expect(result.ok).toBe(false)
    expect(await history(sub.id)).toEqual([])
  })

  it('links a renewal to the original, and keeps both histories', async () => {
    const plan = await addPlan(database, { renewable: true })
    const sub = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: '2026-01-01',
      expiryDate: '2026-12-31',
      status: 'active',
    })

    const renewed = await performSubscriptionAction(database, {
      id: sub.id,
      action: 'renew',
      actorId: data.admin.id,
    })
    if (!renewed.ok) throw new Error('renewal failed')

    expect(await history(sub.id)).toEqual([['renew', 'active', 'active']])
    expect(await history(renewed.data.id)).toEqual([['created', null, 'draft']])
    const [copy] = await database
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, renewed.data.id))
    expect(copy.renewedFromId).toBe(sub.id)
  })

  it('records the moves billing makes on its own, without a person', async () => {
    const today = clock.today()
    const plan = await addPlan(database, { autoClose: true })
    const starting = await addSubscription(database, {
      customerId: data.a.customer.id,
      plan,
      termId: data.term.id,
      startDate: today,
      status: 'confirmed',
    })
    const lapsed = await addSubscription(database, {
      customerId: data.b.customer.id,
      plan,
      termId: data.term.id,
      startDate: format(addMonths(parseISO(today), -3), 'yyyy-MM-dd'),
      expiryDate: format(addMonths(parseISO(today), -1), 'yyyy-MM-dd'),
      status: 'active',
    })

    await runBilling(database, { asOf: today })

    expect(await history(starting.id)).toEqual([['activate', 'confirmed', 'active']])
    expect((await listSubscriptionEvents(database, starting.id))[0].actorName).toBeNull()
    expect((await history(lapsed.id)).at(-1)).toEqual(['auto_close', null, 'closed'])
  })
})
