import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { Facts, InvoiceLines } from '~/components/invoice-parts'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { StatusTimeline } from '~/components/status-timeline'
import { useToast } from '~/components/toast'
import { Totals } from '~/components/totals'
import { capitalize, formatDate, formatMoney } from '~/lib/format'
import { getMySubscription, runMyAction } from '~/server/functions/portal'

const subscriptionQuery = (id: string) =>
  queryOptions({
    queryKey: ['portal', 'subscription', id],
    queryFn: () => getMySubscription({ data: { id } }),
  })

export const Route = createFileRoute('/portal/subscriptions/$id')({
  loader: ({ context, params }) => context.queryClient.query(subscriptionQuery(params.id)),
  component: MySubscriptionPage,
})

type Action = 'pause' | 'resume' | 'close'
const LABELS: Record<Action, string> = { pause: 'Pause', resume: 'Resume', close: 'Close' }
const DONE: Record<Action, string> = {
  pause: 'Subscription paused',
  resume: 'Subscription resumed',
  close: 'Subscription closed',
}

function MySubscriptionPage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(subscriptionQuery(id))
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirming, setConfirming] = useState<Action>()

  const run = useMutation({
    mutationFn: (action: Action) => runMyAction({ data: { id, action } }),
    onSuccess: async (result, action) => {
      setConfirming(undefined)
      if (!result.ok) return toast(result.error ?? 'That did not work', 'danger')
      await queryClient.invalidateQueries()
      toast(DONE[action])
    },
    onError: () => toast('That did not work. Try again.', 'danger'),
  })

  const actions = data.actions.filter(
    (a): a is Action => a === 'pause' || a === 'resume' || a === 'close',
  )

  return (
    <>
      <PageHeader
        title={data.number}
        breadcrumbs={[{ label: 'My Subscriptions', to: '/portal/subscriptions' }]}
        actions={
          actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={run.isPending}
                  className="btn btn-secondary"
                  onClick={() => (action === 'resume' ? run.mutate(action) : setConfirming(action))}
                >
                  {LABELS[action]}
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <div className="flex flex-col gap-6">
        <section aria-label="Status" className="panel flex flex-wrap items-center gap-3">
          <StatusTimeline status={data.status} />
          <StatusBadge status={data.status} />
        </section>

        <section aria-label="Details" className="panel">
          <Facts
            items={[
              [
                'Plan',
                `${data.plan.name} (${formatMoney(data.plan.price)} ${capitalize(data.plan.billingPeriod).toLowerCase()})`,
              ],
              ['Started', formatDate(data.startDate)],
              ['Ends', formatDate(data.expiryDate)],
              ['Next invoice', formatDate(data.nextInvoiceDate)],
            ]}
          />
          <p className="mt-4">
            <Link to="/portal/invoices" search={{ page: 1 }} className="link">
              See your invoices
            </Link>
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-4 text-xl font-semibold">What you pay each period</h2>
          <InvoiceLines lines={data.lines} />
          <Totals subtotal={data.totals.subtotal} tax={data.totals.tax} total={data.totals.total} />
        </section>
      </div>

      <ConfirmDialog
        open={confirming !== undefined}
        title={confirming === 'close' ? `Close ${data.number}?` : `Pause ${data.number}?`}
        message={
          confirming === 'close'
            ? 'A closed subscription stops billing and cannot be reopened.'
            : 'Billing stops while it is paused. You can resume it any time.'
        }
        confirmLabel={confirming === 'close' ? 'Close subscription' : 'Pause subscription'}
        confirmTone={confirming === 'close' ? 'danger' : 'primary'}
        onCancel={() => setConfirming(undefined)}
        onConfirm={() => confirming && run.mutate(confirming)}
      />
    </>
  )
}
