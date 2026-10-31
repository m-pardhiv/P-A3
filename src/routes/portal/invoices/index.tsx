import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { z } from 'zod'
import { DataTable } from '~/components/data-table'
import { PillTabs } from '~/components/design/pill-tabs'
import { EmptyState } from '~/components/empty-state'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { formatDate, formatMoney } from '~/lib/format'
import { listMyInvoices } from '~/server/functions/portal'
import { portalInvoiceListSchema } from '~/shared/schemas/portal'

type Search = z.output<typeof portalInvoiceListSchema>

const invoicesQuery = (search: Search) =>
  queryOptions({
    queryKey: ['portal', 'invoices', search],
    queryFn: () => listMyInvoices({ data: search }),
  })

export const Route = createFileRoute('/portal/invoices/')({
  validateSearch: portalInvoiceListSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.query(invoicesQuery(deps)),
  component: MyInvoicesPage,
})

function MyInvoicesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(invoicesQuery(search))
  const filtered = Boolean(search.status || search.overdue)

  return (
    <>
      <PageHeader
        title="My Invoices"
        description="What you have been billed, and what is still to pay."
      />
      <div className="mb-5">
        <PillTabs
          label="Filter invoices"
          value={search.overdue ? 'overdue' : (search.status ?? 'all')}
          onChange={(value) =>
            navigate({
              search: {
                page: 1,
                status: value === 'confirmed' || value === 'paid' ? value : undefined,
                overdue: value === 'overdue' ? true : undefined,
              },
            })
          }
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'confirmed', label: 'To pay' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'paid', label: 'Paid' },
          ]}
        />
      </div>
      <DataTable
        data={data}
        rowKey={(row) => row.id}
        onPageChange={(page) => navigate({ search: { ...search, page } })}
        empty={
          <EmptyState
            title={filtered ? 'No invoices match' : 'You have no invoices yet'}
            message={
              filtered
                ? 'Show all invoices to see more.'
                : 'Your invoices will appear here once billed.'
            }
          />
        }
        columns={[
          {
            header: 'Invoice',
            cell: (row) => (
              <Link
                to="/portal/invoices/$id"
                params={{ id: row.id }}
                className="link whitespace-nowrap"
              >
                {row.number}
              </Link>
            ),
          },
          { header: 'Subscription', cell: (row) => row.subscriptionNumber },
          {
            header: 'Status',
            cell: (row) => (
              <StatusBadge
                status={
                  row.overdue ? 'overdue' : row.status === 'confirmed' ? 'to pay' : row.status
                }
              />
            ),
          },
          {
            header: 'Issued',
            cell: (row) => <span className="whitespace-nowrap">{formatDate(row.issueDate)}</span>,
          },
          {
            header: 'Due',
            cell: (row) => <span className="whitespace-nowrap">{formatDate(row.dueDate)}</span>,
          },
          { header: 'Total', align: 'right', cell: (row) => formatMoney(row.total) },
          {
            header: 'Still to pay',
            align: 'right',
            cell: (row) => formatMoney(row.total - row.amountPaid),
          },
        ]}
      />
    </>
  )
}
