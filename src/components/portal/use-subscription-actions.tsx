import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type LucideIcon, PauseCircle, PlayCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { useToast } from '~/components/toast'
import { runMyAction } from '~/server/functions/portal'

type Action = 'pause' | 'resume' | 'close'

const META: Record<
  Action,
  {
    label: string
    icon: LucideIcon
    destructive: boolean
    done: string
    title: string
    message: string
    confirm: string
  }
> = {
  pause: {
    label: 'Pause subscription',
    icon: PauseCircle,
    destructive: false,
    done: 'Subscription paused',
    title: 'Pause this subscription?',
    message: 'Billing stops while it is paused. You can resume it any time.',
    confirm: 'Pause subscription',
  },
  resume: {
    label: 'Resume subscription',
    icon: PlayCircle,
    destructive: false,
    done: 'Subscription resumed',
    title: 'Resume this subscription?',
    message: 'Billing carries on from your next billing date.',
    confirm: 'Resume subscription',
  },
  close: {
    label: 'Close subscription',
    icon: XCircle,
    destructive: true,
    done: 'Subscription closed',
    title: 'Close this subscription?',
    message: 'A closed subscription stops billing and cannot be reopened.',
    confirm: 'Close subscription',
  },
}

/**
 * What a customer may do to one subscription, from the actions the server says are allowed, plus
 * the confirmation dialog and the request. The server still checks every one.
 */
export function useSubscriptionActions(subscription: {
  id: string
  number: string
  actions: string[]
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [asking, setAsking] = useState<Action>()

  const run = useMutation({
    mutationFn: (action: Action) => runMyAction({ data: { id: subscription.id, action } }),
    onSuccess: async (result, action) => {
      setAsking(undefined)
      if (!result.ok) return toast(result.error ?? 'That did not work', 'danger')
      await queryClient.invalidateQueries()
      toast(META[action].done)
    },
    onError: () => toast('That did not work. Try again.', 'danger'),
  })

  const actions = (subscription.actions as Action[])
    .filter((action) => action in META)
    .map((action) => ({ action, ...META[action] }))

  /** Resuming asks for nothing, because it only starts billing again. The others confirm first. */
  const request = (action: Action) => (action === 'resume' ? run.mutate(action) : setAsking(action))

  const dialog = (
    <ConfirmDialog
      open={asking !== undefined}
      title={
        asking ? `${META[asking].title.replace('this subscription', subscription.number)}` : ''
      }
      message={asking ? META[asking].message : ''}
      confirmLabel={asking ? META[asking].confirm : ''}
      confirmTone={asking && META[asking].destructive ? 'danger' : 'primary'}
      onCancel={() => setAsking(undefined)}
      onConfirm={() => asking && run.mutate(asking)}
    />
  )

  return { actions, request, dialog, busy: run.isPending }
}
