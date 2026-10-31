import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { z } from 'zod'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { DateFilter, FilterSelect } from '~/components/list-controls'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { capitalize, formatDate, formatMoney, humanize } from '~/lib/format'
import { formOptionsQuery } from '~/lib/queries'
import {
  getDashboardOverdue,
  getDashboardPayments,
  getDashboardSubscriptions,
  getDashboardSummary,
} from '~/server/functions/dashboard'
import { dashboardSearchSchema } from '~/shared/schemas/dashboard'
import { SUBSCRIPTION_STATUSES } from '~/shared/schemas/subscriptions'

type Search = z.output<typeof dashboardSearchSchema>

const filtersOf = (search: Search) => ({
  from: search.from,
  to: search.to,
  planId: search.planId,
  customerId: search.customerId,
  status: search.status,
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
      context.queryClient.query(formOptionsQuery),
    ]),
  component: DashboardPage,
})

function Stat(props: { label: string; value: string; hint: string; tone?: 'danger' }) {
  return (
    <div className="panel">
      <p className="text-sm text-muted">{props.label}</p>
      <p
        className={`tabular mt-1 font-display text-3xl font-semibold ${props.tone === 'danger' ? 'text-danger' : 'text-ink'}`}
      >
        {props.value}
      </p>
      <p className="mt-1 text-sm text-muted">{props.hint}</p>
    </div>
  )
}

function plural(count: number, one: string) {
  return `${count} ${count === 1 ? one : `${one}s`}`
}

function DashboardPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: summary } = useSuspenseQuery(summaryQuery(search))
  const { data: payments } = useSuspenseQuery(paymentsQuery(search))
  const { data: overdue } = useSuspenseQuery(overdueQuery(search))
  const { data: subscriptions } = useSuspenseQuery(subscriptionsQuery(search))
  const { data: options } = useSuspenseQuery(formOptionsQuery)

  const filtered = Boolean(
    search.from || search.to || search.planId || search.customerId || search.status,
  )
  // Changing a filter starts every table from its first page again.
  const setFilter = (patch: Partial<Search>) =>
    navigate({ search: { ...search, ...patch, payPage: 1, overduePage: 1, subPage: 1 } })

  const largestBucket = Math.max(...summary.ageing.map((bucket) => bucket.amount), 1)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Where subscriptions, revenue and money owed stand today."
      />

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
          {filtered ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate({ search: { payPage: 1, overduePage: 1, subPage: 1 } })}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-muted">
          The date range narrows revenue and payments. Plan and customer narrow every number. Status
          narrows the subscriptions table.
        </p>
      </section>

      <section aria-label="Summary" className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Active subscriptions"
          value={String(summary.activeSubscriptions)}
          hint="Running right now"
        />
        <Stat
          label="Monthly recurring revenue"
          value={formatMoney(summary.mrr)}
          hint="Active plans, scaled to one month, before tax"
        />
        <Stat
          label="Revenue collected"
          value={formatMoney(summary.revenue)}
          hint={`${formatDate(summary.from)} to ${formatDate(summary.to)}`}
        />
        <Stat
          label="Outstanding"
          value={formatMoney(summary.outstanding)}
          hint="Owed on confirmed invoices"
        />
        <Stat
          label="Overdue"
          value={formatMoney(summary.overdueAmount)}
          hint={`${plural(summary.overdueCount, 'invoice')} past due`}
          tone={summary.overdueCount > 0 ? 'danger' : undefined}
        />
      </section>

      <section aria-label="Overdue ageing" className="panel mb-6">
        <h2 className="mb-1 text-xl font-semibold">How late the overdue invoices are</h2>
        <p className="mb-4 text-sm text-muted">Days since the due date, by amount still owed.</p>
        <ul className="flex flex-col gap-3">
          {summary.ageing.map((bucket) => (
            <li
              key={bucket.label}
              className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr_16rem]"
            >
              <span className="font-medium">{bucket.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-neutral-soft" aria-hidden>
                <span
                  className="block h-full rounded-full bg-danger"
                  style={{ width: `${(bucket.amount / largestBucket) * 100}%` }}
                />
              </span>
              <span className="tabular text-sm sm:text-right">
                {formatMoney(bucket.amount)} across {plural(bucket.count, 'invoice')}
              </span>
            </li>
          ))}
        </ul>
      </section>

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
                header: 'Amount due',
                align: 'right',
                cell: (row) => formatMoney(row.total - row.amountPaid),
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
