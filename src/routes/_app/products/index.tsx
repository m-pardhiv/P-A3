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
import { listProducts } from '~/server/functions/products'
import { listSearchSchema } from '~/shared/schemas/pagination'

type Search = z.output<typeof listSearchSchema>

const productsQuery = (search: Search) =>
  queryOptions({
    queryKey: ['products', search],
    queryFn: () => listProducts({ data: search }),
  })

export const Route = createFileRoute('/_app/products/')({
  validateSearch: listSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.query(productsQuery(deps)),
  component: ProductsPage,
})

function ProductsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const user = useCurrentUser()
  const { data } = useSuspenseQuery(productsQuery(search))

  return (
    <>
      <PageHeader
        title="Products"
        description="What Brightloop sells, and the variants of each product."
        actions={
          user.role === 'admin' ? (
            <Link to="/products/new" className="btn btn-primary">
              New product
            </Link>
          ) : null
        }
      />
      <div className="mb-4 flex">
        <SearchBar
          label="Search by name or type"
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
            title={search.q ? 'No products match that search' : 'No products yet'}
            message={search.q ? 'Try a different name or type.' : 'Create the first product.'}
          />
        }
        columns={[
          {
            header: 'Name',
            cell: (row) => (
              <Link to="/products/$id" params={{ id: row.id }} className="link">
                {row.name}
              </Link>
            ),
          },
          { header: 'Type', cell: (row) => capitalize(row.type) },
          { header: 'Sales price', align: 'right', cell: (row) => formatMoney(row.salesPrice) },
          { header: 'Cost price', align: 'right', cell: (row) => formatMoney(row.costPrice) },
          {
            header: 'Status',
            cell: (row) => <StatusBadge status={row.active ? 'active' : 'inactive'} />,
          },
        ]}
      />
    </>
  )
}
