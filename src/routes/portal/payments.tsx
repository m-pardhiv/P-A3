import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react'
import { DataTable } from '~/components/data-table'
import { StatCard } from '~/components/design/stat-card'
import { EmptyState } from '~/components/empty-state'
import { PageHeader } from '~/components/page-header'
import { formatDate, formatMoney, humanize } from '~/lib/format'
import { listMyPayments } from '~/server/functions/portal'
import { portalListSchema } from '~/shared/schemas/portal'

const paymentsQuery = (page: number) =>
  queryOptions({
    queryKey: ['portal', 'payments', page],
    queryFn: () => listMyPayments({ data: { page } }),
  })

export const Route = createFileRoute('/portal/payments')({
  validateSearch: portalListSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ context, deps }) => context.queryClient.query(paymentsQuery(deps.page)),
  component: PaymentsPage,
})

const methodIcon = { card: CreditCard, upi: Smartphone, bank_transfer: Landmark } as const

function PaymentsPage() {
  const { page } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data } = useSuspenseQuery(paymentsQuery(page))

  return (
    <>
      <PageHeader
        title="Payment History"
        description="Every payment recorded against your invoices."
      />
      <div className="mb-6 grid gap-4 sm:max-w-md">
        <StatCard
          icon={Wallet}
          label="Total paid"
          value={formatMoney(data.totalPaid)}
          hint={`Across ${data.total} ${data.total === 1 ? 'payment' : 'payments'}`}
        />
      </div>
      <DataTable
        data={data}
        rowKey={(row) => row.id}
        onPageChange={(next) => navigate({ search: { page: next } })}
        empty={
          <EmptyState
            icon={CreditCard}
            title="No payments yet"
            message="Your payments will appear here once they’re recorded against an invoice."
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
                to="/portal/invoices/$id"
                params={{ id: row.invoiceId }}
                className="font-bold whitespace-nowrap hover:text-brand-ink"
              >
                {row.invoiceNumber}
              </Link>
            ),
          },
          {
            header: 'Method',
            cell: (row) => {
              const Icon = methodIcon[row.method as keyof typeof methodIcon] ?? Wallet
              return (
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                  {humanize(row.method)}
                </span>
              )
            },
          },
          { header: 'Amount', align: 'right', cell: (row) => formatMoney(row.amount) },
        ]}
      />
    </>
  )
}
