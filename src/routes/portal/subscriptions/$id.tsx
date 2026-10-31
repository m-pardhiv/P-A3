import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { PlanIcon } from '~/components/design/plan-icon'
import { Timeline } from '~/components/portal/timeline'
import { useSubscriptionActions } from '~/components/portal/use-subscription-actions'
import { StatusBadge } from '~/components/status-badge'
import { Totals } from '~/components/totals'
import { Button, LinkButton } from '~/components/ui/button'
import { Card, CardHeader, CardTitle } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { formatDate, formatMoney, humanize } from '~/lib/format'
import { daysLeft, periodUnit, termProgress } from '~/lib/term'
import { getMySubscription } from '~/server/functions/portal'

const subscriptionQuery = (id: string) =>
  queryOptions({
    queryKey: ['portal', 'subscription', id],
    queryFn: () => getMySubscription({ data: { id } }),
  })

export const Route = createFileRoute('/portal/subscriptions/$id')({
  loader: ({ context, params }) => context.queryClient.query(subscriptionQuery(params.id)),
  component: MySubscriptionPage,
})

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold">{value}</dd>
    </div>
  )
}

function MySubscriptionPage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(subscriptionQuery(id))
  const { actions, request, dialog, busy } = useSubscriptionActions(data)
  const running = data.status === 'active' || data.status === 'paused'
  const progress = termProgress(data.startDate, data.expiryDate, data.today)
  const left = daysLeft(data.expiryDate, data.today)
  const unit = periodUnit[data.plan.billingPeriod] ?? data.plan.billingPeriod

  return (
    <div className="space-y-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1.5">
          <ol className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <li className="flex items-center gap-1">
              <Link
                to="/portal/subscriptions"
                search={{ page: 1 }}
                className="hover:text-foreground"
              >
                My Subscriptions
              </Link>
              <ChevronRight className="size-3 opacity-60" aria-hidden />
            </li>
            <li aria-current="page" className="text-foreground/70">
              {data.number}
            </li>
          </ol>
        </nav>
        <Link
          to="/portal/subscriptions"
          search={{ page: 1 }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All subscriptions
        </Link>
      </header>

      <section className="mesh-hero overflow-hidden rounded-[1.75rem] border border-border/80 px-5 py-6 shadow-soft sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <PlanIcon name={data.plan.name} className="size-16" muted={data.status === 'closed'} />
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight">{data.plan.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <StatusBadge status={data.status} />
                <span className="tabular text-sm text-muted-foreground">{data.number}</span>
              </div>
            </div>
          </div>
          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {actions.map(({ action, label, icon: Icon, destructive }) => (
                <Button
                  key={action}
                  variant={destructive ? 'outline' : action === 'resume' ? 'default' : 'outline'}
                  disabled={busy}
                  className={
                    destructive ? 'border-danger/40 text-danger hover:bg-danger-soft' : undefined
                  }
                  onClick={() => request(action)}
                >
                  <Icon /> {label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subscription information</CardTitle>
            </CardHeader>
            <div className="px-5 pb-6 sm:px-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                <Fact
                  label="Subscription ID"
                  value={<span className="tabular">{data.number}</span>}
                />
                <Fact label="Status" value={<StatusBadge status={data.status} />} />
                <Fact label="Plan" value={data.plan.name} />
                <Fact label="Billing frequency" value={humanize(data.plan.billingPeriod)} />
                <Fact label="Start date" value={formatDate(data.startDate)} />
                <Fact label="Expiry date" value={formatDate(data.expiryDate)} />
              </dl>
              {running && data.expiryDate ? (
                <div className="mt-6 rounded-2xl bg-muted/70 p-4">
                  <div className="mb-2.5 flex items-center justify-between text-[13px]">
                    <span className="font-semibold">Term progress</span>
                    <span className="tabular text-muted-foreground">
                      {progress}% elapsed · {left} {left === 1 ? 'day' : 'days'} left
                    </span>
                  </div>
                  <Progress value={progress} label="Term progress" className="h-2.5" />
                </div>
              ) : null}
              {data.nextInvoiceDate && data.status === 'active' ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Next invoice on{' '}
                  <span className="font-semibold text-foreground">
                    {formatDate(data.nextInvoiceDate)}
                  </span>
                  .
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing</CardTitle>
            </CardHeader>
            <div className="px-5 pb-6 sm:px-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border/70 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 pr-4 font-bold">Item</th>
                      <th className="px-3 py-2.5 text-right font-bold">Qty</th>
                      <th className="px-3 py-2.5 text-right font-bold">Unit price</th>
                      <th className="px-3 py-2.5 text-right font-bold">Tax</th>
                      <th className="py-2.5 pl-3 text-right font-bold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="tabular text-sm">
                    {data.lines.map((line) => (
                      <tr key={line.id} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-4 font-medium">{line.description}</td>
                        <td className="px-3 py-3 text-right">{line.quantity}</td>
                        <td className="px-3 py-3 text-right">{formatMoney(line.unitPrice)}</td>
                        <td className="px-3 py-3 text-right whitespace-nowrap text-muted-foreground">
                          {line.taxRatePercent}%
                        </td>
                        <td className="py-3 pl-3 text-right font-semibold">
                          {formatMoney(line.amount)}
                        </td>
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
              <p className="mt-2 text-right text-xs text-muted-foreground">Charged each {unit}.</p>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <div className="px-5 pb-6 sm:px-6">
              <Timeline
                events={data.events}
                nextInvoice={data.status === 'active' ? data.nextInvoiceDate : null}
              />
            </div>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent invoices</CardTitle>
              <Link
                to="/portal/invoices"
                search={{ page: 1 }}
                className="text-[13px] font-semibold text-brand-ink hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            {data.recentInvoices.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-muted-foreground sm:px-6">No invoices yet.</p>
            ) : (
              <ul className="px-3 pb-3 sm:px-4 sm:pb-4">
                {data.recentInvoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      to="/portal/invoices/$id"
                      params={{ id: invoice.id }}
                      className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-3 transition-colors hover:bg-accent/60"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{invoice.number}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(invoice.issueDate)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-right">
                          <span className="tabular block text-sm font-bold">
                            {formatMoney(invoice.total)}
                          </span>
                          <StatusBadge
                            status={
                              invoice.overdue
                                ? 'overdue'
                                : invoice.status === 'confirmed'
                                  ? 'to pay'
                                  : invoice.status
                            }
                          />
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {['quotation', 'confirmed'].includes(data.status) ? (
            <LinkButton
              to="/print/quotation/$id"
              params={{ id: data.id }}
              target="_blank"
              variant="outline"
              className="w-full"
            >
              Print quotation
            </LinkButton>
          ) : null}
        </div>
      </div>
      {dialog}
    </div>
  )
}
