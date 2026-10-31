import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { z } from 'zod'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { SearchBar } from '~/components/list-controls'
import { PageHeader } from '~/components/page-header'
import { listTemplates } from '~/server/functions/quotation-templates'
import { listSearchSchema } from '~/shared/schemas/pagination'

type Search = z.output<typeof listSearchSchema>

const templatesQuery = (search: Search) =>
  queryOptions({
    queryKey: ['templates', search],
    queryFn: () => listTemplates({ data: search }),
  })

export const Route = createFileRoute('/_app/quotation-templates/')({
  validateSearch: listSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.query(templatesQuery(deps)),
  component: TemplatesPage,
})

function TemplatesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(templatesQuery(search))

  return (
    <>
      <PageHeader
        title="Quotation Templates"
        description="Reusable starting points for new subscriptions."
        actions={
          <Link to="/quotation-templates/new" className="btn btn-primary">
            New template
          </Link>
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
            title={search.q ? 'No templates match that search' : 'No templates yet'}
            message={search.q ? 'Try a different name.' : 'Create the first template.'}
          />
        }
        columns={[
          {
            header: 'Name',
            cell: (row) => (
              <Link to="/quotation-templates/$id" params={{ id: row.id }} className="link">
                {row.name}
              </Link>
            ),
          },
          { header: 'Plan', cell: (row) => row.planName },
          { header: 'Payment terms', cell: (row) => row.termName },
          { header: 'Valid for', align: 'right', cell: (row) => `${row.validityDays} days` },
          { header: 'Lines', align: 'right', cell: (row) => row.lineCount },
          {
            header: 'Actions',
            align: 'right',
            cell: (row) => (
              <Link to="/subscriptions/new" search={{ templateId: row.id }} className="link">
                Use template
              </Link>
            ),
          },
        ]}
      />
    </>
  )
}
