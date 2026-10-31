import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { capitalize, formatDate, formatMoney } from '~/lib/format'
import { listMySubscriptions } from '~/server/functions/portal'
import { portalListSchema } from '~/shared/schemas/portal'

const subscriptionsQuery = (page: number) =>
  queryOptions({
    queryKey: ['portal', 'subscriptions', page],
    queryFn: () => listMySubscriptions({ data: { page } }),
  })

export const Route = createFileRoute('/portal/subscriptions/')({
  validateSearch: portalListSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) => context.queryClient.query(subscriptionsQuery(deps.page)),
  component: MySubscriptionsPage,
})

function MySubscriptionsPage() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(subscriptionsQuery(page))

  return (
    <>
      <PageHeader title="My Subscriptions" description="Your plans with Brightloop." />
      <DataTable
        data={data}
        rowKey={(row) => row.id}
        onPageChange={(next) => navigate({ search: { page: next } })}
        empty={
          <EmptyState
            title="You have no subscriptions yet"
            message="When Brightloop sets one up for you, it will appear here."
          />
        }
        columns={[
          {
            header: 'Number',
            cell: (row) => (
              <Link
                to="/portal/subscriptions/$id"
                params={{ id: row.id }}
                className="link whitespace-nowrap"
              >
                {row.number}
              </Link>
            ),
          },
          { header: 'Plan', cell: (row) => row.planName },
          { header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
          {
            header: 'Started',
            cell: (row) => <span className="whitespace-nowrap">{formatDate(row.startDate)}</span>,
          },
          {
            header: 'Ends',
            cell: (row) => <span className="whitespace-nowrap">{formatDate(row.expiryDate)}</span>,
          },
          {
            header: 'Each period',
            align: 'right',
            cell: (row) =>
              `${formatMoney(row.amount)} ${capitalize(row.billingPeriod).toLowerCase()}`,
          },
        ]}
      />
    </>
  )
}
