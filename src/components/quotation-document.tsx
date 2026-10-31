import { Printer } from 'lucide-react'
import { formatDate } from '~/lib/format'
import { Facts, InvoiceLines } from './invoice-parts'
import { StatusBadge } from './status-badge'
import { Totals } from './totals'

type Quotation = {
  number: string
  status: string
  expired: boolean
  startDate: string
  expiryDate: string | null
  validUntil: string | null
  customerName: string
  customerCompany: string | null
  customerEmail: string
  customerPhone: string | null
  customerAddress: string | null
  planName: string
  termName: string
}

/** A clean page for printing or saving as a PDF from the browser, like the invoice. */
export function QuotationDocument(props: {
  quotation: Quotation
  lines: React.ComponentProps<typeof InvoiceLines>['lines']
  totals: { subtotal: number; tax: number; total: number }
}) {
  const { quotation } = props
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
          <p className="text-muted-foreground">Quotation</p>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-semibold text-ink">{quotation.number}</h1>
          <StatusBadge status={quotation.expired ? 'expired' : quotation.status} />
        </div>
      </header>

      <section className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">Prepared for</h2>
          <p className="font-medium">{quotation.customerName}</p>
          {quotation.customerCompany ? <p>{quotation.customerCompany}</p> : null}
          <p>{quotation.customerEmail}</p>
          {quotation.customerPhone ? <p>{quotation.customerPhone}</p> : null}
          {quotation.customerAddress ? (
            <p className="whitespace-pre-line">{quotation.customerAddress}</p>
          ) : null}
        </div>
        <Facts
          items={[
            ['Plan', quotation.planName],
            ['Starts', formatDate(quotation.startDate)],
            ['Ends', formatDate(quotation.expiryDate)],
            ['Payment terms', quotation.termName],
            ['Valid until', formatDate(quotation.validUntil)],
          ]}
        />
      </section>

      <InvoiceLines lines={props.lines} />
      <Totals subtotal={props.totals.subtotal} tax={props.totals.tax} total={props.totals.total} />

      <p className="mt-10 text-sm text-muted-foreground">
        Amounts are charged each billing period, in Indian rupees, and exclude tax unless a tax
        amount is shown.
      </p>
    </div>
  )
}
