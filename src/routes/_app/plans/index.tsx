import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { z } from 'zod'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { SearchBar } from '~/components/list-controls'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { capitalize, formatMoney } from '~/lib/format'
import { useCurrentUser } from '~/lib/use-current-user'
import { listPlans } from '~/server/functions/plans'
import { listSearchSchema } from '~/shared/schemas/pagination'

type Search = z.output<typeof listSearchSchema>

const plansQuery = (search: Search) =>
  queryOptions({
    queryKey: ['plans', search],
    queryFn: () => listPlans({ data: search }),
  })

export const Route = createFileRoute('/_app/plans/')({
  validateSearch: listSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.query(plansQuery(deps)),
  component: PlansPage,
})

function flagsFor(plan: {
  pausable: boolean
  closable: boolean
  renewable: boolean
  autoClose: boolean
}) {
  const flags = [
    plan.pausable && 'Pause',
    plan.closable && 'Early close',
    plan.renewable && 'Renew',
    plan.autoClose && 'Auto close',
  ].filter(Boolean)
  return flags.length ? flags.join(', ') : 'None'
}

function PlansPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const user = useCurrentUser()
  const canEdit = user.role === 'admin'
  const { data } = useSuspenseQuery(plansQuery(search))

  return (
    <>
      <PageHeader
        title="Plans"
        description={
          canEdit
            ? 'Recurring pricing, and what customers can do with a subscription.'
            : 'Recurring pricing. Only an admin can change plans.'
        }
        actions={
          canEdit ? (
            <Link to="/plans/new" className="btn btn-primary">
              New plan
            </Link>
          ) : null
        }
      />
      <div className="mb-4 flex">
        <SearchBar
          label="Search by name"
          value={search.q}
          onSearch={(q) => navigate({ search: { q, page: 1 } })}
        />
      </div>
      <DataTable
        data={data}
        rowKey={(row) => row.id}
        onPageChange={(page) => navigate({ search: { ...search, page } })}
        empty={
          <EmptyState
            title={search.q ? 'No plans match that search' : 'No plans yet'}
            message={search.q ? 'Try a different name.' : 'An admin can create the first plan.'}
          />
        }
        columns={[
          {
            header: 'Name',
            cell: (row) => (
              <Link to="/plans/$id" params={{ id: row.id }} className="link">
                {row.name}
              </Link>
            ),
          },
          { header: 'Price', align: 'right', cell: (row) => formatMoney(row.price) },
          { header: 'Billed', cell: (row) => capitalize(row.billingPeriod) },
          { header: 'Minimum', align: 'right', cell: (row) => row.minQuantity },
          { header: 'Allowed', cell: flagsFor },
          {
            header: 'Status',
            cell: (row) => <StatusBadge status={row.active ? 'active' : 'inactive'} />,
          },
        ]}
      />
    </>
  )
}
