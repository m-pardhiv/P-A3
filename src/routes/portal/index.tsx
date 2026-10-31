import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileText,
  Layers,
  type LucideIcon,
  Settings2,
  UserRound,
  Wallet,
} from 'lucide-react'
import { MonthlyBarChart } from '~/components/design/charts'
import { PlanIcon } from '~/components/design/plan-icon'
import { StatCard } from '~/components/design/stat-card'
import { EmptyState } from '~/components/empty-state'
import { useSubscriptionActions } from '~/components/portal/use-subscription-actions'
import { WelcomeHero } from '~/components/portal/welcome-hero'
import { StatusBadge } from '~/components/status-badge'
import { Button, LinkButton } from '~/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Progress } from '~/components/ui/progress'
import { formatDate, formatMoney, humanize, relativeDays } from '~/lib/format'
import { staggerContainer, staggerItem } from '~/lib/motion'
import { daysLeft, periodUnit, termProgress } from '~/lib/term'
import { getMyOverview } from '~/server/functions/portal'

const overviewQuery = queryOptions({
  queryKey: ['portal', 'overview'],
  queryFn: () => getMyOverview(),
})

export const Route = createFileRoute('/portal/')({
  loader: ({ context }) => context.queryClient.query(overviewQuery),
  component: OverviewPage,
})

type Overview = Awaited<ReturnType<typeof getMyOverview>>

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold">{value}</dd>
    </div>
  )
}

function QuickActions({ subscriptionId }: { subscriptionId?: string }) {
  const actions: { label: string; icon: LucideIcon }[] = [
    {
      label: 'View subscription',
      icon: Layers,
    },
    {
      label: 'View invoices',
      icon: FileText,
    },
    {
      label: 'Payment history',
      icon: CreditCard,
    },
    { label: 'Manage account', icon: UserRound },
  ]
  const item = (label: string, Icon: LucideIcon) => (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-brand-ink transition-colors group-hover:bg-brand-gradient group-hover:text-white">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 leading-tight">{label}</span>
      <ArrowUpRight
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100"
        aria-hidden
      />
    </>
  )
  const cls =
    'group flex min-h-14 items-center gap-3 rounded-2xl border border-border/80 bg-card px-3.5 py-2 text-sm font-semibold shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-raspberry/40 hover:shadow-lift'
  return (
    <motion.section variants={staggerItem} aria-label="Quick actions">
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        Quick actions
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map(({ label, icon: Icon }, index) => (
          <li key={label}>
            {index === 0 && subscriptionId ? (
              <Link to="/portal/subscriptions/$id" params={{ id: subscriptionId }} className={cls}>
                {item(label, Icon)}
              </Link>
            ) : index === 0 ? (
              <Link to="/portal/subscriptions" search={{ page: 1 }} className={cls}>
                {item(label, Icon)}
              </Link>
            ) : index === 1 ? (
              <Link to="/portal/invoices" search={{ page: 1 }} className={cls}>
                {item(label, Icon)}
              </Link>
            ) : index === 2 ? (
              <Link to="/portal/payments" search={{ page: 1 }} className={cls}>
                {item(label, Icon)}
              </Link>
            ) : (
              <Link to="/portal/profile" className={cls}>
                {item(label, Icon)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </motion.section>
  )
}

function CurrentSubscription({ data }: { data: Overview }) {
  const sub = data.current
  const { actions, request, dialog } = useSubscriptionActions({
    id: sub?.id ?? '',
    number: sub?.number ?? '',
    // The server decides what is allowed. The overview only offers the actions the plan permits.
    actions: sub ? ['pause', 'close'] : [],
  })

  if (!sub) {
    return (
      <Card className="flex h-full items-center justify-center">
        <EmptyState
          icon={Layers}
          title="No active subscription"
          message="When you have an active subscription, its details and next billing date will appear here."
          action={
            <LinkButton to="/portal/subscriptions" search={{ page: 1 }}>
              View my subscriptions
            </LinkButton>
          }
        />
      </Card>
    )
  }

  const progress = termProgress(sub.startDate, sub.expiryDate, data.today)
  const left = daysLeft(sub.expiryDate, data.today)
  const unit = periodUnit[sub.billingPeriod] ?? sub.billingPeriod

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative border-b border-border/70 bg-gradient-to-br from-brand-50 via-white to-white px-5 py-5 sm:px-7 sm:py-6">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-brand-ink">
          Current subscription
        </p>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <PlanIcon name={sub.planName} className="size-14" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl font-extrabold tracking-tight">{sub.planName}</h3>
                <StatusBadge status="active" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="tabular">{sub.number}</span>
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="tabular text-3xl font-extrabold leading-none tracking-tight">
              {formatMoney(sub.amount + sub.tax)}
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">per {unit}, incl. tax</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-6 sm:px-7">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Fact label="Start date" value={formatDate(sub.startDate)} />
          <Fact label="Next invoice" value={formatDate(sub.nextInvoiceDate)} />
          <Fact label="Billing" value={humanize(sub.billingPeriod)} />
          <Fact label="Quantity" value={sub.quantity} />
        </dl>

        {sub.expiryDate ? (
          <div className="mt-6">
            <div className="mb-2.5 flex items-center justify-between text-[13px]">
              <span className="font-semibold">Subscription period</span>
              <span className="tabular text-muted-foreground">
                {progress}% elapsed · {left} {left === 1 ? 'day' : 'days'} left
              </span>
            </div>
            <Progress value={progress} label="Subscription period elapsed" className="h-2.5" />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{formatDate(sub.startDate)}</span>
              <span>{formatDate(sub.expiryDate)}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap gap-2.5 pt-6">
          <LinkButton to="/portal/subscriptions/$id" params={{ id: sub.id }}>
            View details
          </LinkButton>
          {actions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="group">
                  <Settings2 /> Manage subscription
                  <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {actions.map(({ action, label, icon: Icon, destructive }) => (
                  <DropdownMenuItem
                    key={action}
                    destructive={destructive}
                    onSelect={() => request(action)}
                  >
                    <Icon /> {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {dialog}
    </Card>
  )
}

function OverviewPage() {
  const { data } = useSuspenseQuery(overviewQuery)
  const chartTotal = data.paymentsByMonth.reduce((sum, point) => sum + point.amount, 0)

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <h1 className="sr-only">Overview</h1>
      <motion.div variants={staggerItem}>
        <WelcomeHero
          today={data.today}
          firstName={data.customerName.split(' ')[0]}
          message="Here’s what’s happening with your subscriptions."
          chip={
            data.nextInvoiceDate
              ? `${data.nextInvoicePlan} is billed ${relativeDays(data.nextInvoiceDate, data.today)}`
              : undefined
          }
          attention={{
            count: data.overdueInvoices,
            singular: 'invoice needs attention',
            plural: 'invoices need attention',
            allGood: 'Everything is up to date',
          }}
        />
      </motion.div>

      <motion.div variants={staggerContainer} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Active subscriptions"
          value={data.activeSubscriptions}
          hint={`of ${data.totalSubscriptions} total subscriptions`}
        />
        <StatCard
          icon={CalendarClock}
          label="Next invoice"
          value={data.nextInvoiceDate ? formatDate(data.nextInvoiceDate) : '—'}
          hint={
            data.nextInvoiceDate
              ? `${data.nextInvoicePlan} · ${relativeDays(data.nextInvoiceDate, data.today)}`
              : 'Nothing is due to be billed'
          }
        />
        <StatCard
          icon={Wallet}
          label="Total paid"
          value={formatMoney(data.totalPaid)}
          hint={`Across ${data.paymentCount} ${data.paymentCount === 1 ? 'payment' : 'payments'}`}
        />
        <StatCard
          icon={CircleDollarSign}
          tone={data.outstanding > 0 ? 'warn' : 'brand'}
          label="Outstanding amount"
          value={formatMoney(data.outstanding)}
          hint={
            data.outstanding > 0
              ? `${data.outstandingInvoices} ${data.outstandingInvoices === 1 ? 'invoice' : 'invoices'}${data.overdueInvoices ? ` · ${data.overdueInvoices} overdue` : ''}`
              : 'You’re all paid up'
          }
        />
      </motion.div>

      <QuickActions subscriptionId={data.current?.id} />

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div variants={staggerItem} className="min-w-0 lg:col-span-8">
          <CurrentSubscription data={data} />
        </motion.div>
        <motion.div variants={staggerItem} className="min-w-0 lg:col-span-4">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Payments received</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
              <p className="tabular pt-2 text-2xl font-extrabold tracking-tight">
                {formatMoney(chartTotal)}
              </p>
            </CardHeader>
            <div className="mt-auto px-3 pb-5 sm:px-4">
              <MonthlyBarChart
                data={data.paymentsByMonth}
                label="Bar chart of your payments over the last six months"
                caption="Paid this month"
              />
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div variants={staggerItem} className="min-w-0 lg:col-span-8">
          <Card className="h-full overflow-hidden">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent invoices</CardTitle>
              <LinkButton to="/portal/invoices" search={{ page: 1 }} variant="soft" size="sm">
                View all invoices
              </LinkButton>
            </CardHeader>
            {data.recentInvoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                message="Invoices will appear here once they’re issued."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-y border-border/70 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3 font-bold">Invoice</th>
                      <th className="px-3 py-3 font-bold">Issued</th>
                      <th className="px-3 py-3 font-bold">Due</th>
                      <th className="px-3 py-3 text-right font-bold">Total</th>
                      <th className="px-5 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="tabular text-sm">
                    {data.recentInvoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b border-border/60 last:border-0 hover:bg-accent/30"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            to="/portal/invoices/$id"
                            params={{ id: invoice.id }}
                            className="font-bold whitespace-nowrap hover:text-brand-ink"
                          >
                            {invoice.number}
                          </Link>
                        </td>
                        <td className="px-3 py-3.5 whitespace-nowrap">
                          {formatDate(invoice.issueDate)}
                        </td>
                        <td
                          className={`px-3 py-3.5 whitespace-nowrap ${invoice.overdue ? 'font-semibold text-danger' : ''}`}
                        >
                          {formatDate(invoice.dueDate)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold">
                          {formatMoney(invoice.total)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge
                            status={
                              invoice.overdue
                                ? 'overdue'
                                : invoice.status === 'confirmed'
                                  ? 'to pay'
                                  : invoice.status
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.outstanding > 0 ? (
              <p className="border-t border-border/70 px-5 py-3.5 text-[13px] text-muted-foreground sm:px-6">
                You have{' '}
                <span className="tabular font-semibold text-foreground">
                  {formatMoney(data.outstanding)}
                </span>{' '}
                outstanding.{' '}
                <Link
                  to="/portal/invoices"
                  search={{ page: 1 }}
                  className="font-semibold text-brand-ink hover:underline"
                >
                  Review invoices
                </Link>
              </p>
            ) : null}
          </Card>
        </motion.div>

        <motion.div variants={staggerItem} className="min-w-0 lg:col-span-4">
          <Card className="flex h-full flex-col">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent payments</CardTitle>
              <Link
                to="/portal/payments"
                search={{ page: 1 }}
                className="text-[13px] font-semibold text-brand-ink hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            {data.recentPayments.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                message="Your payments will appear here once they’re made."
              />
            ) : (
              <ul className="px-3 pb-3 sm:px-4 sm:pb-4">
                {data.recentPayments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center gap-3 rounded-2xl px-2.5 py-3 transition-colors hover:bg-accent/60 sm:px-3"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/70">
                      <CreditCard className="size-[18px]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="tabular truncate text-[13px] font-bold">
                        {payment.invoiceNumber}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(payment.paidOn)} · {humanize(payment.method)}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-sm font-bold">
                      {formatMoney(payment.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
