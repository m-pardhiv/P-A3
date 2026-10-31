import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { FormError, FormField } from '~/components/form-field'
import { type LineDraft, LineEditor, linesPayload } from '~/components/line-editor'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { StatusTimeline } from '~/components/status-timeline'
import { useToast } from '~/components/toast'
import { Totals } from '~/components/totals'
import { useZodForm } from '~/components/use-zod-form'
import { capitalize, formatDate, formatMoney } from '~/lib/format'
import { formOptionsQuery } from '~/lib/queries'
import {
  getSubscription,
  runSubscriptionAction,
  updateSubscriptionLines,
} from '~/server/functions/subscriptions'
import { updateLinesSchema } from '~/shared/schemas/subscriptions'

const subscriptionQuery = (id: string) =>
  queryOptions({
    queryKey: ['subscription', id],
    queryFn: () => getSubscription({ data: { id } }),
  })

export const Route = createFileRoute('/_app/subscriptions/$id')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.query(subscriptionQuery(params.id)),
      context.queryClient.query(formOptionsQuery),
    ]),
  component: SubscriptionPage,
})

type Subscription = Awaited<ReturnType<typeof getSubscription>>
type Action = Subscription['actions'][number]

const ACTION_LABELS: Record<Action, string> = {
  send: 'Send quotation',
  confirm: 'Confirm',
  activate: 'Activate',
  pause: 'Pause',
  resume: 'Resume',
  renew: 'Renew',
  close: 'Close',
}

const DONE_MESSAGES: Record<Action, string> = {
  send: 'Quotation sent',
  confirm: 'Subscription confirmed',
  activate: 'Subscription activated',
  pause: 'Subscription paused',
  resume: 'Subscription resumed',
  renew: 'Renewal draft created',
  close: 'Subscription closed',
}

function ActionButtons({ subscription }: { subscription: Subscription }) {
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmingClose, setConfirmingClose] = useState(false)

  const run = useMutation({
    mutationFn: (action: Action) =>
      runSubscriptionAction({ data: { id: subscription.id, action } }),
    onSuccess: async (result, action) => {
      setConfirmingClose(false)
      if (!result.ok) {
        toast(result.error ?? 'That did not work', 'danger')
        return
      }
      await queryClient.invalidateQueries()
      toast(DONE_MESSAGES[action])
      if (result.data.id !== subscription.id) {
        navigate({ to: '/subscriptions/$id', params: { id: result.data.id } })
      }
    },
    onError: () => toast('That did not work. Try again.', 'danger'),
  })

  return (
    <div className="flex flex-wrap gap-2">
      {subscription.actions.map((action, index) => (
        <button
          key={action}
          type="button"
          disabled={run.isPending}
          className={`btn ${index === 0 && action !== 'close' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => (action === 'close' ? setConfirmingClose(true) : run.mutate(action))}
        >
          {ACTION_LABELS[action]}
        </button>
      ))}
      <ConfirmDialog
        open={confirmingClose}
        title={`Close ${subscription.number}?`}
        message="A closed subscription stops billing and cannot be reopened."
        confirmLabel="Close subscription"
        onCancel={() => setConfirmingClose(false)}
        onConfirm={() => run.mutate('close')}
      />
    </div>
  )
}

function LinesEditor(props: { subscription: Subscription; onDone: () => void }) {
  const { subscription, onDone } = props
  const { data: options } = useSuspenseQuery(formOptionsQuery)
  const queryClient = useQueryClient()
  const toast = useToast()

  const planLine = subscription.lines.find((line) => line.productId === null)
  const [lines, setLines] = useState<LineDraft[]>(() =>
    subscription.lines
      .filter((line) => line.productId !== null)
      .map((line) => ({
        key: line.id,
        id: line.id,
        productId: line.productId as string,
        variantId: line.variantId ?? '',
        quantity: String(line.quantity),
        unitPrice: line.unitPrice,
        taxRatePercent: line.taxRatePercent,
      })),
  )

  const form = useZodForm({
    schema: updateLinesSchema,
    values: () => ({ id: subscription.id, lines: linesPayload(lines) }),
    submit: (input) => updateSubscriptionLines({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      toast('Lines saved')
      onDone()
    },
  })

  return (
    <form onSubmit={form.onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={form.formError} />
      <div className="max-w-xs">
        <FormField
          label={`${subscription.plan.name} quantity`}
          name="planQuantity"
          inputMode="numeric"
          defaultValue={planLine?.quantity}
          hint={`Minimum ${subscription.plan.minQuantity}`}
          error={form.fieldErrors.planQuantity}
        />
      </div>
      <LineEditor
        lines={lines}
        products={options.products}
        errors={form.fieldErrors}
        onChange={setLines}
      />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={form.pending}>
          {form.pending ? 'Saving lines' : 'Save lines'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function SubscriptionPage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(subscriptionQuery(id))
  const [editing, setEditing] = useState(false)

  const facts: [string, React.ReactNode][] = [
    [
      'Customer',
      <Link key="customer" to="/customers/$id" params={{ id: data.customerId }} className="link">
        {data.customerName}
      </Link>,
    ],
    ['Company', data.customerCompany ?? 'None'],
    ['Plan', `${data.plan.name} (${formatMoney(data.plan.price)} ${data.plan.billingPeriod})`],
    ['Payment terms', data.termName],
    ['Start date', formatDate(data.startDate)],
    ['Expiry date', formatDate(data.expiryDate)],
    ['Next invoice', formatDate(data.nextInvoiceDate)],
    [
      'Invoices',
      <Link
        key="invoices"
        to="/invoices"
        search={{ page: 1, subscriptionId: data.id }}
        className="link"
      >
        View invoices for this subscription
      </Link>,
    ],
    ['Quotation valid until', formatDate(data.quotationValidUntil)],
    ['Template', data.templateName ?? 'None'],
  ]

  return (
    <>
      <PageHeader
        title={data.number}
        breadcrumbs={[{ label: 'Subscriptions', to: '/subscriptions' }]}
        actions={<ActionButtons subscription={data} />}
      />

      <div className="flex flex-col gap-6">
        <section aria-label="Status" className="panel flex flex-wrap items-center gap-3">
          <StatusTimeline status={data.status} />
          <StatusBadge status={data.status} />
          {data.quotationExpired ? (
            <p className="text-danger">
              This quotation expired on {formatDate(data.quotationValidUntil)} and cannot be
              confirmed.
            </p>
          ) : null}
          {data.renewalId ? (
            <p>
              Renewed as{' '}
              <Link to="/subscriptions/$id" params={{ id: data.renewalId }} className="link">
                {data.renewalNumber}
              </Link>
            </p>
          ) : null}
          {data.renewedFromId ? (
            <p>
              Renewal of{' '}
              <Link to="/subscriptions/$id" params={{ id: data.renewedFromId }} className="link">
                {data.renewedFromNumber}
              </Link>
            </p>
          ) : null}
        </section>

        <section aria-label="Details" className="panel">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Lines</h2>
            {data.canEditLines && !editing ? (
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
                Edit lines
              </button>
            ) : null}
          </div>

          {editing ? (
            <LinesEditor subscription={data} onDone={() => setEditing(false)} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-sm text-muted">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Product
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">
                        Quantity
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">
                        Unit price
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">
                        Tax
                      </th>
                      <th scope="col" className="py-2 pl-4 text-right font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {data.lines.map((line) => (
                      <tr key={line.id} className="border-b border-line last:border-0">
                        <td className="py-2 pr-4">{line.description}</td>
                        <td className="px-4 py-2 text-right">{line.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(line.unitPrice)}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          {formatMoney(line.taxAmount)} ({line.taxRatePercent}%)
                        </td>
                        <td className="py-2 pl-4 text-right">{formatMoney(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Totals
                subtotal={data.totals.subtotal}
                tax={data.totals.tax}
                total={data.totals.total}
              />
            </>
          )}
        </section>
      </div>
    </>
  )
}
