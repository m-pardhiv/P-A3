import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { z } from 'zod'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { DateFilter, FilterSelect, SearchBar } from '~/components/list-controls'
import { PageHeader } from '~/components/page-header'
import { formatDate, formatMoney, humanize } from '~/lib/format'
import { formOptionsQuery } from '~/lib/queries'
import { listPayments } from '~/server/functions/payments'
import { PAYMENT_METHODS, paymentListSchema } from '~/shared/schemas/invoices'

type Search = z.output<typeof paymentListSchema>

const paymentsQuery = (search: Search) =>
  queryOptions({
    queryKey: ['payments', search],
    queryFn: () => listPayments({ data: search }),
  })

export const Route = createFileRoute('/_app/payments')({
  validateSearch: paymentListSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query(paymentsQuery(deps)),
      context.queryClient.query(formOptionsQuery),
    ]),
  component: PaymentsPage,
})

function PaymentsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(paymentsQuery(search))
  const { data: options } = useSuspenseQuery(formOptionsQuery)
  const filtered = Boolean(
    search.method || search.customerId || search.invoice || search.from || search.to,
  )
  const setFilter = (patch: Partial<Search>) =>
    navigate({ search: { ...search, ...patch, page: 1 } })

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment recorded against an invoice. Record new ones from the invoice."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBar
          label="Search by invoice number"
          value={search.invoice}
          onSearch={(invoice) => setFilter({ invoice })}
        />
        <FilterSelect
          label="All methods"
          value={search.method}
          options={PAYMENT_METHODS.map((value) => ({ value, label: humanize(value) }))}
          onChange={(method) => setFilter({ method: method as Search['method'] })}
        />
        <FilterSelect
          label="All customers"
          value={search.customerId}
          options={options.customers.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(customerId) => setFilter({ customerId })}
        />
        <DateFilter
          label="Paid from"
          value={search.from}
          onChange={(from) => setFilter({ from })}
        />
        <DateFilter label="to" value={search.to} onChange={(to) => setFilter({ to })} />
      </div>

      <DataTable
        data={data}
        rowKey={(row) => row.id}
        onPageChange={(page) => navigate({ search: { ...search, page } })}
        empty={
          <EmptyState
            title={filtered ? 'No payments match these filters' : 'No payments yet'}
            message={
              filtered
                ? 'Clear a filter to see more.'
                : 'Open a confirmed invoice and record a payment to see it here.'
            }
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
          { header: 'Recorded by', cell: (row) => row.recordedByName },
          { header: 'Note', cell: (row) => row.note ?? '' },
          { header: 'Amount', align: 'right', cell: (row) => formatMoney(row.amount) },
        ]}
      />
    </>
  )
}
