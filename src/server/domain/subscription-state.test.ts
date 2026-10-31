import { describe, expect, it } from 'vitest'
import {
  allowedActions,
  canEditLines,
  type SubscriptionContext,
  shouldAutoClose,
  transition,
} from './subscription-state'

const context = (overrides: Partial<SubscriptionContext> = {}): SubscriptionContext => ({
  status: 'active',
  startDate: '2026-01-01',
  expiryDate: '2026-12-31',
  quotationValidUntil: null,
  alreadyRenewed: false,
  plan: { pausable: true, closable: true, renewable: true, autoClose: false },
  today: '2026-06-01',
  ...overrides,
})

const plan = (overrides: Partial<SubscriptionContext['plan']>) => ({
  ...context().plan,
  ...overrides,
})

describe('the happy path', () => {
  it('moves draft to quotation to confirmed to active', () => {
    expect(transition(context({ status: 'draft' }), 'send')).toEqual({
      ok: true,
      status: 'quotation',
    })
    expect(transition(context({ status: 'quotation' }), 'confirm')).toEqual({
      ok: true,
      status: 'confirmed',
    })
    expect(transition(context({ status: 'confirmed' }), 'activate')).toEqual({
      ok: true,
      status: 'active',
    })
  })
})

describe('invalid moves', () => {
  it('cannot skip from draft to active', () => {
    expect(transition(context({ status: 'draft' }), 'activate').ok).toBe(false)
  })

  it('cannot reopen a closed subscription', () => {
    expect(transition(context({ status: 'closed' }), 'resume').ok).toBe(false)
  })

  it('refuses an expired quotation', () => {
    const result = transition(
      context({ status: 'quotation', quotationValidUntil: '2026-05-31' }),
      'confirm',
    )
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('expired') })
  })

  it('accepts a quotation on its last valid day', () => {
    const result = transition(
      context({ status: 'quotation', quotationValidUntil: '2026-06-01' }),
      'confirm',
    )
    expect(result.ok).toBe(true)
  })

  it('cannot activate before the start date', () => {
    const result = transition(context({ status: 'confirmed', startDate: '2026-06-02' }), 'activate')
    expect(result.ok).toBe(false)
  })
})

describe('plan flags', () => {
  it('pauses only when the plan is pausable', () => {
    expect(allowedActions(context())).toContain('pause')
    expect(allowedActions(context({ plan: plan({ pausable: false }) }))).not.toContain('pause')
  })

  it('closes early only when the plan is closable', () => {
    expect(allowedActions(context({ plan: plan({ closable: false }) }))).not.toContain('close')
  })

  it('allows closing a non-closable plan once it has reached expiry', () => {
    const atExpiry = context({ plan: plan({ closable: false }), today: '2026-12-31' })
    expect(allowedActions(atExpiry)).toContain('close')
  })

  it('treats a subscription with no expiry as always early', () => {
    const openEnded = context({ plan: plan({ closable: false }), expiryDate: null })
    expect(allowedActions(openEnded)).not.toContain('close')
  })

  it('renews only when renewable, dated and not already renewed', () => {
    expect(allowedActions(context())).toContain('renew')
    expect(allowedActions(context({ plan: plan({ renewable: false }) }))).not.toContain('renew')
    expect(allowedActions(context({ expiryDate: null }))).not.toContain('renew')
    expect(allowedActions(context({ alreadyRenewed: true }))).not.toContain('renew')
  })
})

describe('line editing and auto close', () => {
  it('allows line edits only in draft and quotation', () => {
    expect(canEditLines('draft')).toBe(true)
    expect(canEditLines('quotation')).toBe(true)
    expect(canEditLines('confirmed')).toBe(false)
    expect(canEditLines('active')).toBe(false)
  })

  it('auto closes only past expiry on an auto_close plan', () => {
    const past = { today: '2027-01-01' }
    expect(shouldAutoClose(context({ ...past, plan: plan({ autoClose: true }) }))).toBe(true)
    expect(shouldAutoClose(context(past))).toBe(false)
    expect(shouldAutoClose(context({ plan: plan({ autoClose: true }) }))).toBe(false)
  })
})
