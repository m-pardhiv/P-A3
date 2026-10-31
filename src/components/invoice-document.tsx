import { Printer } from 'lucide-react'
import { formatDate } from '~/lib/format'
import { Facts, InvoiceLines, InvoiceTotals, PaymentsTable } from './invoice-parts'
import { StatusBadge } from './status-badge'

type Invoice = {
  number: string
  status: string
  overdue: boolean
  issueDate: string
  dueDate: string
  periodStart: string
  periodEnd: string
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  amountPaid: number
  subscriptionNumber: string
  customerName: string
  customerCompany: string | null
  customerEmail: string
  customerSnapshot: {
    name: string
    company: string | null
    email: string
    phone: string | null
    address: string | null
  } | null
}

/** A clean page for printing or saving as a PDF from the browser. No PDF library is involved. */
export function InvoiceDocument(props: {
  invoice: Invoice
  lines: React.ComponentProps<typeof InvoiceLines>['lines']
  payments: React.ComponentProps<typeof PaymentsTable>['payments']
}) {
  const { invoice } = props
  // The invoice shows the customer as they were when it was billed, not as they are now.
  const billTo = invoice.customerSnapshot ?? {
    name: invoice.customerName,
    company: invoice.customerCompany,
    email: invoice.customerEmail,
    phone: null,
    address: null,
  }

  return (
    <div className="mx-auto max-w-3xl bg-surface p-6 sm:p-10 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex justify-end">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={18} aria-hidden />
          Print or save as PDF
        </button>
      </div>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-semibold text-ink">Brightloop Software</p>
          <p className="text-muted-foreground">Subscription invoice</p>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-semibold text-ink">{invoice.number}</h1>
          <StatusBadge status={invoice.overdue ? 'overdue' : invoice.status} />
        </div>
      </header>

      <section className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">Billed to</h2>
          <p className="font-medium">{billTo.name}</p>
          {billTo.company ? <p>{billTo.company}</p> : null}
          <p>{billTo.email}</p>
          {billTo.phone ? <p>{billTo.phone}</p> : null}
          {billTo.address ? <p className="whitespace-pre-line">{billTo.address}</p> : null}
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

      <InvoiceLines lines={props.lines} />
      <InvoiceTotals invoice={invoice} />

      {props.payments.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Payments received</h2>
          <PaymentsTable payments={props.payments} />
        </section>
      ) : null}

      <p className="mt-10 text-sm text-muted-foreground">
        Prices are in Indian rupees and exclude tax unless a tax amount is shown.
      </p>
    </div>
  )
}
