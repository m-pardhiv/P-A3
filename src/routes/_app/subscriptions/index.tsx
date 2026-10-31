import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { z } from 'zod'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { FilterSelect, SearchBar } from '~/components/list-controls'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { capitalize, formatDate, formatMoney } from '~/lib/format'
import { formOptionsQuery } from '~/lib/queries'
import { listSubscriptions } from '~/server/functions/subscriptions'
import { SUBSCRIPTION_STATUSES, subscriptionListSchema } from '~/shared/schemas/subscriptions'

type Search = z.output<typeof subscriptionListSchema>

const subscriptionsQuery = (search: Search) =>
  queryOptions({
    queryKey: ['subscriptions', search],
    queryFn: () => listSubscriptions({ data: search }),
  })

export const Route = createFileRoute('/_app/subscriptions/')({
  validateSearch: subscriptionListSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query(subscriptionsQuery(deps)),
      context.queryClient.query(formOptionsQuery),
    ]),
  component: SubscriptionsPage,
})

function SubscriptionsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(subscriptionsQuery(search))
  const { data: options } = useSuspenseQuery(formOptionsQuery)
  const filtered = Boolean(search.q || search.status || search.planId || search.customerId)

  const setFilter = (patch: Partial<Search>) =>
    navigate({ search: { ...search, ...patch, page: 1 } })

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Every quotation and recurring agreement, from draft to closed."
        actions={
          <Link to="/subscriptions/new" className="btn btn-primary">
            New subscription
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <SearchBar
          label="Search by number or customer"
          value={search.q}
          onSearch={(q) => setFilter({ q })}
        />
        <FilterSelect
          label="All statuses"
          value={search.status}
          options={SUBSCRIPTION_STATUSES.map((value) => ({ value, label: capitalize(value) }))}
          onChange={(value) => setFilter({ status: value as Search['status'] })}
        />
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
      </div>
      <DataTable
        data={data}
        rowKey={(row) => row.id}
        onPageChange={(page) => navigate({ search: { ...search, page } })}
        empty={
          <EmptyState
            title={filtered ? 'No subscriptions match these filters' : 'No subscriptions yet'}
            message={filtered ? 'Clear a filter to see more.' : 'Create the first subscription.'}
          />
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
            header: 'Start',
            cell: (row) => <span className="whitespace-nowrap">{formatDate(row.startDate)}</span>,
          },
          {
            header: 'Expiry',
            cell: (row) => <span className="whitespace-nowrap">{formatDate(row.expiryDate)}</span>,
          },
          { header: 'Amount', align: 'right', cell: (row) => formatMoney(row.amount) },
        ]}
      />
    </>
  )
}
