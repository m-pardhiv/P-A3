import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CircleDollarSign, Layers, TrendingUp, TriangleAlert, Wallet } from 'lucide-react'
import type { z } from 'zod'
import { DataTable } from '~/components/data-table'
import { MonthlyBarChart } from '~/components/design/charts'
import { StatCard } from '~/components/design/stat-card'
import { EmptyState } from '~/components/empty-state'
import { DateFilter, FilterSelect } from '~/components/list-controls'
import { PageHeader } from '~/components/page-header'
import { WelcomeHero } from '~/components/portal/welcome-hero'
import { StatusBadge } from '~/components/status-badge'
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { capitalize, formatDate, formatMoney, humanize } from '~/lib/format'
import { staggerContainer } from '~/lib/motion'
import { formOptionsQuery } from '~/lib/queries'
import {
  getDashboardInvoices,
  getDashboardOverdue,
  getDashboardPayments,
  getDashboardSubscriptions,
  getDashboardSummary,
} from '~/server/functions/dashboard'
import { dashboardSearchSchema } from '~/shared/schemas/dashboard'
import { INVOICE_STATUSES } from '~/shared/schemas/invoices'
import { SUBSCRIPTION_STATUSES } from '~/shared/schemas/subscriptions'

type Search = z.output<typeof dashboardSearchSchema>

const filtersOf = (search: Search) => ({
  from: search.from,
  to: search.to,
  planId: search.planId,
  customerId: search.customerId,
  status: search.status,
  invoiceStatus: search.invoiceStatus,
})

const summaryQuery = (search: Search) =>
  queryOptions({
    queryKey: ['dashboard', 'summary', filtersOf(search)],
    queryFn: () => getDashboardSummary({ data: filtersOf(search) }),
  })
const paymentsQuery = (search: Search) =>
  queryOptions({
    queryKey: ['dashboard', 'payments', filtersOf(search), search.payPage],
    queryFn: () => getDashboardPayments({ data: { ...filtersOf(search), page: search.payPage } }),
  })
const overdueQuery = (search: Search) =>
  queryOptions({
    queryKey: ['dashboard', 'overdue', filtersOf(search), search.overduePage],
    queryFn: () =>
      getDashboardOverdue({ data: { ...filtersOf(search), page: search.overduePage } }),
  })
const invoicesQuery = (search: Search) =>
  queryOptions({
    queryKey: ['dashboard', 'invoices', filtersOf(search), search.invoicePage],
    queryFn: () =>
      getDashboardInvoices({ data: { ...filtersOf(search), page: search.invoicePage } }),
  })
const subscriptionsQuery = (search: Search) =>
  queryOptions({
    queryKey: ['dashboard', 'subscriptions', filtersOf(search), search.subPage],
    queryFn: () =>
      getDashboardSubscriptions({ data: { ...filtersOf(search), page: search.subPage } }),
  })

export const Route = createFileRoute('/_app/dashboard')({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query(summaryQuery(deps)),
      context.queryClient.query(paymentsQuery(deps)),
      context.queryClient.query(overdueQuery(deps)),
      context.queryClient.query(subscriptionsQuery(deps)),
      context.queryClient.query(invoicesQuery(deps)),
      context.queryClient.query(formOptionsQuery),
    ]),
  component: DashboardPage,
})

function plural(count: number, one: string) {
  return `${count} ${count === 1 ? one : `${one}s`}`
}

function DashboardPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = Route.useRouteContext()
  const { data: summary } = useSuspenseQuery(summaryQuery(search))
  const { data: payments } = useSuspenseQuery(paymentsQuery(search))
  const { data: overdue } = useSuspenseQuery(overdueQuery(search))
  const { data: subscriptions } = useSuspenseQuery(subscriptionsQuery(search))
  const { data: invoices } = useSuspenseQuery(invoicesQuery(search))
  const { data: options } = useSuspenseQuery(formOptionsQuery)

  const filtered = Boolean(
    search.from ||
      search.to ||
      search.planId ||
      search.customerId ||
      search.status ||
      search.invoiceStatus,
  )
  // Changing a filter starts every table from its first page again.
  const setFilter = (patch: Partial<Search>) =>
    navigate({
      search: { ...search, ...patch, payPage: 1, overduePage: 1, subPage: 1, invoicePage: 1 },
    })

  const largestBucket = Math.max(...summary.ageing.map((bucket) => bucket.amount), 1)

  return (
    <>
      <h1 className="sr-only">Dashboard</h1>
      <div className="mb-6">
        <WelcomeHero
          today={summary.today}
          eyebrow={user.role === 'admin' ? 'Admin console' : 'Staff console'}
          firstName={user.name.split(' ')[0]}
          message="Where subscriptions, revenue and money owed stand today."
          chip={`${plural(summary.activeSubscriptions, 'subscription')} running`}
          attention={{
            count: summary.overdueCount,
            singular: 'invoice is overdue',
            plural: 'invoices are overdue',
            allGood: 'Nothing is overdue',
          }}
        />
      </div>

      <section aria-label="Filters" className="panel mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <DateFilter
            label="Paid from"
            value={summary.from}
            onChange={(from) => setFilter({ from })}
          />
          <DateFilter label="to" value={summary.to} onChange={(to) => setFilter({ to })} />
          <FilterSelect
            label="All plans"
            value={search.planId}
            options={options.plans.map((plan) => ({ value: plan.id, label: plan.name }))}
            onChange={(planId) => setFilter({ planId })}
          />
          <FilterSelect
            label="All customers"
            value={search.customerId}
            options={options.customers.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(customerId) => setFilter({ customerId })}
          />
          <FilterSelect
            label="All statuses"
            value={search.status}
            options={SUBSCRIPTION_STATUSES.map((value) => ({ value, label: capitalize(value) }))}
            onChange={(status) => setFilter({ status: status as Search['status'] })}
          />
          <FilterSelect
            label="All invoice statuses"
            value={search.invoiceStatus}
            options={[...INVOICE_STATUSES, 'overdue'].map((value) => ({
              value,
              label: capitalize(value),
            }))}
            onChange={(invoiceStatus) =>
              setFilter({ invoiceStatus: invoiceStatus as Search['invoiceStatus'] })
            }
          />
          {filtered ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                navigate({ search: { payPage: 1, overduePage: 1, subPage: 1, invoicePage: 1 } })
              }
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The date range narrows revenue and payments. Plan and customer narrow every number. Status
          narrows the subscriptions table.
        </p>
      </section>

      <motion.section
        aria-label="Summary"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <StatCard
          icon={Layers}
          label="Active subscriptions"
          value={summary.activeSubscriptions}
          hint="Running right now"
        />
        <StatCard
          icon={TrendingUp}
          label="Monthly recurring revenue"
          value={formatMoney(summary.mrr)}
          hint="Active plans, per month, before tax"
        />
        <StatCard
          icon={Wallet}
          label="Revenue collected"
          value={formatMoney(summary.revenue)}
          hint={`${formatDate(summary.from)} to ${formatDate(summary.to)}`}
        />
        <StatCard
          icon={CircleDollarSign}
          label="Outstanding"
          value={formatMoney(summary.outstanding)}
          hint="Owed on confirmed invoices"
        />
        <StatCard
          icon={TriangleAlert}
          tone={summary.overdueCount > 0 ? 'warn' : 'brand'}
          label="Overdue"
          value={formatMoney(summary.overdueAmount)}
          hint={`${plural(summary.overdueCount, 'invoice')} past due`}
        />
      </motion.section>

      <div className="mb-8 grid gap-6 lg:grid-cols-12">
        <Card className="min-w-0 lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by month</CardTitle>
            <CardDescription>Payments received, last 6 months</CardDescription>
          </CardHeader>
          <div className="px-3 pb-5 sm:px-5">
            <MonthlyBarChart
              data={summary.revenueByMonth}
              label="Bar chart of payments received in each of the last six months"
              caption="Received this month"
              height={240}
            />
          </div>
        </Card>

        <section aria-label="Overdue ageing" className="min-w-0 lg:col-span-5">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">How late the overdue invoices are</CardTitle>
              <CardDescription>Days since the due date, by amount still owed.</CardDescription>
            </CardHeader>
            <ul className="flex flex-col gap-5 px-5 pb-6 sm:px-6">
              {summary.ageing.map((bucket) => (
                <li key={bucket.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold">{bucket.label}</span>
                    <span className="tabular text-muted-foreground">
                      {formatMoney(bucket.amount)} · {plural(bucket.count, 'invoice')}
                    </span>
                  </div>
                  <span
                    className="block h-2.5 overflow-hidden rounded-full bg-secondary"
                    aria-hidden
                  >
                    <span
                      className="block h-full rounded-full bg-brand-gradient"
                      style={{ width: `${(bucket.amount / largestBucket) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Recent payments</h2>
          <DataTable
            data={payments}
            rowKey={(row) => row.id}
            onPageChange={(payPage) => navigate({ search: { ...search, payPage } })}
            empty={
              <EmptyState
                title="No payments in this range"
                message="Widen the date range, or record a payment on a confirmed invoice."
              />
            }
            columns={[
              {
                header: 'Paid on',
                cell: (row) => <span className="whitespace-nowrap">{formatDate(row.paidOn)}</span>,
              },
              {
                header: 'Invoice',
                cell: (row) => (
                  <Link
                    to="/invoices/$id"
                    params={{ id: row.invoiceId }}
                    className="link whitespace-nowrap"
                  >
                    {row.invoiceNumber}
                  </Link>
                ),
              },
              { header: 'Customer', cell: (row) => row.customerName },
              { header: 'Method', cell: (row) => humanize(row.method) },
              { header: 'Amount', align: 'right', cell: (row) => formatMoney(row.amount) },
            ]}
          />
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Overdue invoices</h2>
          <DataTable
            data={overdue}
            rowKey={(row) => row.id}
            onPageChange={(overduePage) => navigate({ search: { ...search, overduePage } })}
            empty={
              <EmptyState
                title="Nothing is overdue"
                message="Every confirmed invoice is paid or still inside its due date."
              />
            }
            columns={[
              {
                header: 'Invoice',
                cell: (row) => (
                  <Link
                    to="/invoices/$id"
                    params={{ id: row.id }}
                    className="link whitespace-nowrap"
                  >
                    {row.number}
                  </Link>
                ),
              },
              { header: 'Customer', cell: (row) => row.customerName },
              {
                header: 'Due',
                cell: (row) => <span className="whitespace-nowrap">{formatDate(row.dueDate)}</span>,
              },
              {
                header: 'Days overdue',
                align: 'right',
                cell: (row) => row.daysOverdue,
              },
              {
                header: 'Reminders sent',
                align: 'right',
                cell: (row) => row.reminders,
              },
              {
                header: 'Amount due',
                align: 'right',
                cell: (row) => formatMoney(row.total - row.amountPaid),
              },
            ]}
          />
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Invoices</h2>
          <DataTable
            data={invoices}
            rowKey={(row) => row.id}
            onPageChange={(invoicePage) => navigate({ search: { ...search, invoicePage } })}
            empty={<EmptyState title="No invoices match" message="Clear a filter to see more." />}
            columns={[
              {
                header: 'Invoice',
                cell: (row) => (
                  <Link
                    to="/invoices/$id"
                    params={{ id: row.id }}
                    className="link whitespace-nowrap"
                  >
                    {row.number}
                  </Link>
                ),
              },
              { header: 'Customer', cell: (row) => row.customerName },
              {
                header: 'Status',
                cell: (row) => <StatusBadge status={row.overdue ? 'overdue' : row.status} />,
              },
              {
                header: 'Issued',
                cell: (row) => (
                  <span className="whitespace-nowrap">{formatDate(row.issueDate)}</span>
                ),
              },
              {
                header: 'Due',
                cell: (row) => <span className="whitespace-nowrap">{formatDate(row.dueDate)}</span>,
              },
              { header: 'Total', align: 'right', cell: (row) => formatMoney(row.total) },
              {
                header: 'Amount due',
                align: 'right',
                cell: (row) =>
                  formatMoney(row.status === 'cancelled' ? 0 : row.total - row.amountPaid),
              },
            ]}
          />
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Subscriptions</h2>
          <DataTable
            data={subscriptions}
            rowKey={(row) => row.id}
            onPageChange={(subPage) => navigate({ search: { ...search, subPage } })}
            empty={
              <EmptyState title="No subscriptions match" message="Clear a filter to see more." />
            }
            columns={[
              {
                header: 'Number',
                cell: (row) => (
                  <Link
                    to="/subscriptions/$id"
                    params={{ id: row.id }}
                    className="link whitespace-nowrap"
                  >
                    {row.number}
                  </Link>
                ),
              },
              { header: 'Customer', cell: (row) => row.customerName },
              { header: 'Plan', cell: (row) => row.planName },
              { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
              {
                header: 'Next invoice',
                cell: (row) => (
                  <span className="whitespace-nowrap">{formatDate(row.nextInvoiceDate)}</span>
                ),
              },
              { header: 'Per period', align: 'right', cell: (row) => formatMoney(row.amount) },
            ]}
          />
        </section>
      </div>
    </>
  )
}
