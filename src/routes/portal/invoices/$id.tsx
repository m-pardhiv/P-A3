import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
import { Facts, InvoiceLines, InvoiceTotals, PaymentsTable } from '~/components/invoice-parts'
import { PageHeader } from '~/components/page-header'
import { StatusBadge } from '~/components/status-badge'
import { formatDate, formatMoney } from '~/lib/format'
import { getMyInvoice } from '~/server/functions/portal'

const invoiceQuery = (id: string) =>
  queryOptions({
    queryKey: ['portal', 'invoice', id],
    queryFn: () => getMyInvoice({ data: { id } }),
  })

export const Route = createFileRoute('/portal/invoices/$id')({
  loader: ({ context, params }) => context.queryClient.query(invoiceQuery(params.id)),
  component: MyInvoicePage,
})

function MyInvoicePage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(invoiceQuery(id))
  const { invoice, lines, payments } = data
  const owed = invoice.total - invoice.amountPaid

  return (
    <>
      <PageHeader
        title={invoice.number}
        breadcrumbs={[{ label: 'My Invoices', to: '/portal/invoices' }]}
        actions={
          <Link
            to="/print/invoice/$id"
            params={{ id }}
            target="_blank"
            className="btn btn-secondary"
          >
            <Printer size={18} aria-hidden />
            Print
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <section aria-label="Details" className="panel flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              status={
                invoice.overdue
                  ? 'overdue'
                  : invoice.status === 'confirmed'
                    ? 'to pay'
                    : invoice.status
              }
            />
            {owed > 0 ? (
              <p className={invoice.overdue ? 'text-danger' : undefined}>
                {formatMoney(owed)} to pay by {formatDate(invoice.dueDate)}
              </p>
            ) : (
              <p className="text-success">Paid in full</p>
            )}
          </div>
          <Facts
            items={[
              ['Subscription', invoice.subscriptionNumber],
              [
                'Billing period',
                `${formatDate(invoice.periodStart)} to ${formatDate(invoice.periodEnd)}`,
              ],
              ['Issued', formatDate(invoice.issueDate)],
              ['Due', formatDate(invoice.dueDate)],
            ]}
          />
        </section>

        <section className="panel">
          <h2 className="mb-4 text-xl font-semibold">Lines</h2>
          <InvoiceLines lines={lines} />
          <InvoiceTotals invoice={invoice} />
        </section>

        <section className="panel">
          <h2 className="mb-4 text-xl font-semibold">Payments</h2>
          <PaymentsTable payments={payments} />
        </section>
      </div>
    </>
  )
}
