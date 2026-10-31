import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronRight, Printer } from 'lucide-react'
import { InvoiceLines, InvoiceTotals } from '~/components/invoice-parts'
import { Logo } from '~/components/shell/logo'
import { StatusBadge } from '~/components/status-badge'
import { LinkButton } from '~/components/ui/button'
import { Card, CardHeader, CardTitle } from '~/components/ui/card'
import { company } from '~/lib/company'
import { formatDate, formatMoney, humanize } from '~/lib/format'
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

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 text-[15px] font-semibold">{children}</div>
    </div>
  )
}

function MyInvoicePage() {
  const { id } = Route.useParams()
  const { data } = useSuspenseQuery(invoiceQuery(id))
  const { invoice, lines, payments } = data
  const owed = invoice.total - invoice.amountPaid
  const status = invoice.overdue
    ? 'overdue'
    : invoice.status === 'confirmed'
      ? 'to pay'
      : invoice.status
  // The invoice shows the customer as they were when it was billed, not as they are now.
  const billTo = invoice.customerSnapshot ?? {
    name: invoice.customerName,
    company: invoice.customerCompany,
    email: invoice.customerEmail,
    phone: null,
    address: null,
  }
  const paidShare = invoice.total > 0 ? Math.round((invoice.amountPaid / invoice.total) * 100) : 0

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav aria-label="Breadcrumb" className="mb-1.5">
            <ol className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <li className="flex items-center gap-1">
                <Link to="/portal/invoices" search={{ page: 1 }} className="hover:text-foreground">
                  Invoices
                </Link>
                <ChevronRight className="size-3 opacity-60" aria-hidden />
              </li>
              <li aria-current="page" className="text-foreground/70">
                {invoice.number}
              </li>
            </ol>
          </nav>
          <Link
            to="/portal/invoices"
            search={{ page: 1 }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> All invoices
          </Link>
        </div>
        <LinkButton to="/print/invoice/$id" params={{ id }} target="_blank">
          <Printer /> Print or save as PDF
        </LinkButton>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="min-w-0 overflow-hidden lg:col-span-8">
          <div className="mesh-hero flex flex-wrap items-start justify-between gap-6 px-6 py-8 sm:px-9">
            <div>
              <Logo />
              <p className="mt-4 text-sm font-semibold">{company.name}</p>
              <p className="text-sm text-muted-foreground">{company.supportEmail}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Invoice
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {invoice.number}
              </h1>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>

          <div className="space-y-8 px-6 py-7 sm:px-9">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Block label="Invoice date">{formatDate(invoice.issueDate)}</Block>
              <Block label="Due date">
                <span className={invoice.overdue ? 'text-danger' : undefined}>
                  {formatDate(invoice.dueDate)}
                </span>
              </Block>
              <Block label="Subscription">
                <span className="tabular">{invoice.subscriptionNumber}</span>
              </Block>
              <Block label="Billing period">
                <span className="text-[13px]">
                  {formatDate(invoice.periodStart)} to {formatDate(invoice.periodEnd)}
                </span>
              </Block>
            </div>

            <hr className="border-border/70" />

            <div className="grid gap-6 sm:grid-cols-2">
              <Block label="Billed to">
                <p>{billTo.company ?? billTo.name}</p>
                {billTo.company ? <p className="font-normal">{billTo.name}</p> : null}
                {billTo.address ? (
                  <p className="font-normal whitespace-pre-line text-muted-foreground">
                    {billTo.address}
                  </p>
                ) : null}
              </Block>
              <Block label="Contact">
                <p className="font-normal">{billTo.email}</p>
                {billTo.phone ? <p className="font-normal">{billTo.phone}</p> : null}
              </Block>
            </div>

            <hr className="border-border/70" />

            <InvoiceLines lines={lines} />
            <InvoiceTotals invoice={invoice} />
          </div>
        </Card>

        <div className="min-w-0 space-y-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment status</CardTitle>
            </CardHeader>
            <div className="px-5 pb-6 sm:px-6">
              <div className="flex items-baseline justify-between">
                <p className="tabular text-3xl font-extrabold tracking-tight">
                  {formatMoney(owed)}
                </p>
                <p className="text-sm text-muted-foreground">to pay</p>
              </div>
              <div
                role="progressbar"
                aria-label="Share of the invoice paid"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={paidShare}
                className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"
              >
                <div
                  className="h-full rounded-full bg-brand-gradient"
                  style={{ width: `${paidShare}%` }}
                />
              </div>
              <dl className="tabular mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-semibold">{formatMoney(invoice.total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="font-semibold">{formatMoney(invoice.amountPaid)}</dd>
                </div>
              </dl>
              {owed > 0 ? (
                <p className="mt-4 rounded-2xl bg-muted/70 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
                  {invoice.overdue ? (
                    <>
                      <span className="font-semibold text-danger">Overdue.</span> This was due on{' '}
                      {formatDate(invoice.dueDate)}.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">To pay.</span> Due by{' '}
                      {formatDate(invoice.dueDate)}.
                    </>
                  )}{' '}
                  Questions? Email {company.supportEmail}.
                </p>
              ) : (
                <p className="mt-4 rounded-2xl bg-success-soft px-4 py-3 text-[13px] font-semibold text-success">
                  Paid in full. Thank you.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payments on this invoice</CardTitle>
            </CardHeader>
            <div className="px-5 pb-6 sm:px-6">
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                      <span>
                        <span className="block text-sm font-semibold">
                          {humanize(payment.method)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDate(payment.paidOn)}
                        </span>
                      </span>
                      <span className="tabular text-sm font-bold">
                        {formatMoney(payment.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
