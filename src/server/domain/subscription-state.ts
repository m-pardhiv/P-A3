export type SubscriptionStatus =
  | 'draft'
  | 'quotation'
  | 'confirmed'
  | 'active'
  | 'paused'
  | 'closed'

export type SubscriptionAction =
  | 'send'
  | 'confirm'
  | 'activate'
  | 'pause'
  | 'resume'
  | 'close'
  | 'renew'

/** The only legal moves. Renew keeps the status: it creates a new draft instead. */
export const TRANSITIONS: Record<
  SubscriptionStatus,
  Partial<Record<SubscriptionAction, SubscriptionStatus>>
> = {
  draft: { send: 'quotation', close: 'closed' },
  quotation: { confirm: 'confirmed', close: 'closed' },
  confirmed: { activate: 'active', close: 'closed' },
  active: { pause: 'paused', close: 'closed', renew: 'active' },
  paused: { resume: 'active', close: 'closed' },
  closed: { renew: 'closed' },
}

export const ACTION_ORDER: SubscriptionAction[] = [
  'send',
  'confirm',
  'activate',
  'resume',
  'pause',
  'renew',
  'close',
]

export type SubscriptionContext = {
  status: SubscriptionStatus
  startDate: string
  expiryDate: string | null
  quotationValidUntil: string | null
  alreadyRenewed: boolean
  plan: { pausable: boolean; closable: boolean; renewable: boolean; autoClose: boolean }
  today: string
}

/** Why a move in the table is still not allowed right now, or null when it is. */
function ruleViolation(action: SubscriptionAction, s: SubscriptionContext): string | null {
  switch (action) {
    case 'confirm':
      return s.quotationValidUntil && s.quotationValidUntil < s.today
        ? 'This quotation has expired and cannot be confirmed'
        : null
    case 'activate':
      return s.startDate > s.today ? `This subscription starts on ${s.startDate}` : null
    case 'pause':
      return s.plan.pausable ? null : 'This plan cannot be paused'
    case 'close': {
      const running = s.status === 'active' || s.status === 'paused'
      const early = !s.expiryDate || s.today < s.expiryDate
      return running && early && !s.plan.closable ? 'This plan cannot be closed early' : null
    }
    case 'renew':
      if (!s.plan.renewable) return 'This plan cannot be renewed'
      if (!s.expiryDate) return 'Only a subscription with an expiry date can be renewed'
      return s.alreadyRenewed ? 'This subscription has already been renewed' : null
    default:
      return null
  }
}

export function transition(context: SubscriptionContext, action: SubscriptionAction) {
  const status = TRANSITIONS[context.status][action]
  if (!status) {
    return { ok: false as const, error: `A ${context.status} subscription cannot do that` }
  }
  const error = ruleViolation(action, context)
  return error ? { ok: false as const, error } : { ok: true as const, status }
}

export const allowedActions = (context: SubscriptionContext) =>
  ACTION_ORDER.filter((action) => transition(context, action).ok)

export const canEditLines = (status: SubscriptionStatus) =>
  status === 'draft' || status === 'quotation'

/** Part 3's billing run calls this: expiry alone closes a subscription only on auto_close plans. */
export const shouldAutoClose = (context: SubscriptionContext) =>
  context.plan.autoClose &&
  context.expiryDate !== null &&
  context.today > context.expiryDate &&
  (context.status === 'active' || context.status === 'paused')
