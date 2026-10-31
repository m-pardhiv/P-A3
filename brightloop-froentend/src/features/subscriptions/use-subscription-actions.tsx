import { CalendarPlus, PauseCircle, PlayCircle, XCircle, type LucideIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { usePortal } from '@/context/portal'
import { useToast } from '@/context/toast'
import { addMonths, formatDate, parseDate, startOfToday, toISODate } from '@/lib/format'
import type { Subscription, SubscriptionAction } from '@/types'

export interface ActionDef {
  action: SubscriptionAction
  label: string
  icon: LucideIcon
  destructive?: boolean
}

const defs: Record<SubscriptionAction, ActionDef> = {
  pause: { action: 'pause', label: 'Pause subscription', icon: PauseCircle },
  resume: { action: 'resume', label: 'Resume subscription', icon: PlayCircle },
  renew: { action: 'renew', label: 'Renew subscription', icon: CalendarPlus },
  cancel: { action: 'cancel', label: 'Cancel subscription', icon: XCircle, destructive: true },
}

/**
 * The only place that decides which self-service actions are offered. An action is available
 * only when the plan configuration allows it AND the subscription is in a state where it applies.
 */
export function availableActions(sub: Subscription): ActionDef[] {
  const { permissions: p, status } = sub
  const list: ActionDef[] = []
  if (p.canResume && status === 'paused') list.push(defs.resume)
  if (p.canPause && status === 'active') list.push(defs.pause)
  if (p.canRenew && (status === 'active' || status === 'closed')) list.push(defs.renew)
  if (p.canCancel && status !== 'closed') list.push(defs.cancel)
  return list
}

function copyFor(sub: Subscription, action: SubscriptionAction) {
  const name = sub.productName
  switch (action) {
    case 'pause':
      return {
        title: `Pause ${name}?`,
        description: 'Billing stops until you resume. You can resume at any time from this page.',
        confirm: 'Pause subscription',
        success: ['Subscription paused', `${name} won’t be billed until you resume it.`],
      }
    case 'resume':
      return {
        title: `Resume ${name}?`,
        description: 'Billing restarts and the subscription becomes active again.',
        confirm: 'Resume subscription',
        success: ['Subscription resumed', `${name} is active again.`],
      }
    case 'renew': {
      const base = sub.status === 'closed' ? startOfToday() : parseDate(sub.expiryDate)
      const until = formatDate(toISODate(addMonths(base, 12)))
      return {
        title: `Renew ${name}?`,
        description: `This extends your subscription by 12 months, to ${until}. You can review the details afterwards.`,
        confirm: 'Renew for 12 months',
        success: ['Subscription renewed', `${name} now runs until ${until}.`],
      }
    }
    case 'cancel':
      return sub.status === 'pending'
        ? {
            title: `Cancel your ${name} order?`,
            description: 'Your order will be cancelled before it starts. You won’t be billed.',
            confirm: 'Cancel order',
            success: ['Order cancelled', `${name} will not start.`],
          }
        : {
            title: `Cancel ${name}?`,
            description: `The subscription will be closed. Your access continues until ${formatDate(sub.expiryDate)}. You can’t undo this from the portal.`,
            confirm: 'Yes, cancel subscription',
            success: ['Subscription cancelled', `Access continues until ${formatDate(sub.expiryDate)}.`],
          }
  }
}

/** Gives a component the permitted actions for a subscription plus the confirmation dialog to render. */
export function useSubscriptionActions(sub: Subscription) {
  const { runSubscriptionAction } = usePortal()
  const toast = useToast()
  const [pending, setPending] = useState<SubscriptionAction | null>(null)
  const [open, setOpen] = useState(false)

  const actions = useMemo(() => availableActions(sub), [sub])

  const request = useCallback((action: SubscriptionAction) => {
    setPending(action)
    setOpen(true)
  }, [])

  const copy = pending ? copyFor(sub, pending) : null
  const def = pending ? defs[pending] : null

  const dialog = copy && def && (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirm}
      tone={def.destructive ? 'destructive' : 'default'}
      icon={<def.icon className="size-5" />}
      onConfirm={async () => {
        await runSubscriptionAction(sub.id, def.action)
        toast.success(copy.success[0], copy.success[1])
      }}
    />
  )

  return { actions, request, dialog }
}
