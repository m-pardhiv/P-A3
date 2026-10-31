import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { z } from 'zod'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { DataTable } from '~/components/data-table'
import { EmptyState } from '~/components/empty-state'
import { DateFilter, FilterSelect, SearchBar } from '~/components/list-controls'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { useToast } from '~/components/toast'
import { capitalize, formatDate, formatMoney } from '~/lib/format'
import { formOptionsQuery } from '~/lib/queries'
import { confirmAllDrafts, listInvoicesFn } from '~/server/functions/invoices'
import { INVOICE_STATUSES, invoiceListSchema } from '~/shared/schemas/invoices'

type Search = z.output<typeof invoiceListSchema>

const invoicesQuery = (search: Search) =>
  queryOptions({
    queryKey: ['invoices', search],
    queryFn: () => listInvoicesFn({ data: search }),
  })

export const Route = createFileRoute('/_app/invoices/')({
  validateSearch: invoiceListSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.query(invoicesQuery(deps)),
      context.queryClient.query(formOptionsQuery),
    ]),
  component: InvoicesPage,
})

function InvoicesPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(invoicesQuery(search))
  const { data: options } = useSuspenseQuery(formOptionsQuery)
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmingAll, setConfirmingAll] = useState(false)

  const filtered = Boolean(
    search.q ||
      search.status ||
      search.overdue ||
      search.customerId ||
      search.subscriptionId ||
      search.from ||
      search.to,
  )
  const setFilter = (patch: Partial<Search>) =>
    navigate({ search: { ...search, ...patch, page: 1 } })

  const confirmAll = useMutation({
    mutationFn: () => confirmAllDrafts(),
    onSuccess: async (result) => {
      setConfirmingAll(false)
      if (!result.ok) return toast('That did not work. Try again.', 'danger')
      await queryClient.invalidateQueries()
      const { count } = result.data
      toast(count === 0 ? 'There are no draft invoices to confirm' : `${count} invoices confirmed`)
    },
    onError: () => toast('That did not work. Try again.', 'danger'),
  })

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Created by billing as drafts. Confirm them to send and collect payment."
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setConfirmingAll(true)}
          >
            Confirm all drafts
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBar
          label="Search by invoice number"
          value={search.q}
          onSearch={(q) => setFilter({ q })}
        />
        <FilterSelect
          label="All statuses"
          value={search.overdue ? 'overdue' : search.status}
          options={[
            ...INVOICE_STATUSES.map((value) => ({ value, label: capitalize(value) })),
            { value: 'overdue', label: 'Overdue' },
          ]}
          onChange={(value) =>
            value === 'overdue'
              ? setFilter({ status: undefined, overdue: true })
              : setFilter({ status: value as Search['status'], overdue: undefined })
          }
        />
        <FilterSelect
          label="All customers"
          value={search.customerId}
          options={options.customers.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(customerId) => setFilter({ customerId })}
        />
        <DateFilter
          label="Issued from"
          value={search.from}
          onChange={(from) => setFilter({ from })}
        />
        <DateFilter label="to" value={search.to} onChange={(to) => setFilter({ to })} />
        {search.subscriptionId ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFilter({ subscriptionId: undefined })}
          >
            One subscription only. Show all
          </button>
        ) : null}
      </div>

      <DataTable
        data={data}
        rowKey={(row) => row.id}
        onPageChange={(page) => navigate({ search: { ...search, page } })}
        empty={
          <EmptyState
            title={filtered ? 'No invoices match these filters' : 'No invoices yet'}
            message={
              filtered
                ? 'Clear a filter to see more.'
                : 'Run billing to create invoices for every subscription that is due.'
            }
            action={
              filtered ? null : (
                <Link to="/billing" search={{ page: 1 }} className="btn btn-primary mt-2">
                  Go to billing
                </Link>
              )
            }
          />
        }
        columns={[
          {
            header: 'Number',
            cell: (row) => (
              <Link to="/invoices/$id" params={{ id: row.id }} className="link whitespace-nowrap">
                {row.number}
              </Link>
            ),
          },
          { header: 'Customer', cell: (row) => row.customerName },
          {
            header: 'Subscription',
            cell: (row) => (
              <Link
                to="/subscriptions/$id"
                params={{ id: row.subscriptionId }}
                className="link whitespace-nowrap"
              >
                {row.subscriptionNumber}
              </Link>
            ),
          },
          {
            header: 'Status',
            cell: (row) => <StatusBadge status={row.overdue ? 'overdue' : row.status} />,
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
          { header: 'Paid', align: 'right', cell: (row) => formatMoney(row.amountPaid) },
          {
            header: 'Amount due',
            align: 'right',
            cell: (row) => formatMoney(row.status === 'cancelled' ? 0 : row.total - row.amountPaid),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmingAll}
        title="Confirm all draft invoices?"
        message="Every draft invoice becomes confirmed and can take payments. A confirmed invoice with no payments can still be cancelled."
        confirmLabel="Confirm all drafts"
        confirmTone="primary"
        onCancel={() => setConfirmingAll(false)}
        onConfirm={() => confirmAll.mutate()}
      />
    </>
  )
}
