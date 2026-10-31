import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { z } from 'zod'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { SearchBar } from '~/components/list-controls'
import { PageHeader } from '~/components/page-header'
import { listCustomers } from '~/server/functions/customers'
import { listSearchSchema } from '~/shared/schemas/pagination'

type Search = z.output<typeof listSearchSchema>

const customersQuery = (search: Search) =>
  queryOptions({
    queryKey: ['customers', search],
    queryFn: () => listCustomers({ data: search }),
  })

export const Route = createFileRoute('/_app/customers/')({
  validateSearch: listSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.query(customersQuery(deps)),
  component: CustomersPage,
})

function CustomersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(customersQuery(search))

  return (
    <>
      <PageHeader
        title="Customers"
        description="Companies and people Brightloop bills."
        actions={
          <Link to="/customers/new" className="btn btn-primary">
            New customer
          </Link>
        }
      />
      <div className="mb-4 flex">
        <SearchBar
          label="Search by name, company or email"
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
            title={search.q ? 'No customers match that search' : 'No customers yet'}
            message={search.q ? 'Try a different name or email.' : 'Create the first customer.'}
          />
        }
        columns={[
          {
            header: 'Name',
            cell: (row) => (
              <Link to="/customers/$id" params={{ id: row.id }} className="link">
                {row.name}
              </Link>
            ),
          },
          { header: 'Company', cell: (row) => row.company ?? 'None' },
          { header: 'Email', cell: (row) => row.email },
          { header: 'Phone', cell: (row) => row.phone ?? 'None' },
        ]}
      />
    </>
  )
}
