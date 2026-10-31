import { formatDate, formatMoney, humanize } from '~/lib/format'
import { Totals } from './totals'

type Line = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRatePercent: number
  taxAmount: number
  amount: number
}

type Payment = { id: string; paidOn: string; amount: number; method: string }

type InvoiceAmounts = {
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  amountPaid: number
}

/** Shared by the staff page, the customer portal and the print page. */
export function InvoiceLines({ lines }: { lines: Line[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            <th scope="col" className="py-2 pr-4 font-medium">
              Description
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Quantity
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Unit price
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Tax
            </th>
            <th scope="col" className="py-2 pl-4 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="tabular">
          {lines.map((line) => (
            <tr key={line.id} className="border-b border-line last:border-0">
              <td className="py-2 pr-4">{line.description}</td>
              <td className="px-4 py-2 text-right">{line.quantity}</td>
              <td className="px-4 py-2 text-right">{formatMoney(line.unitPrice)}</td>
              <td className="px-4 py-2 text-right whitespace-nowrap">
                {formatMoney(line.taxAmount)} ({line.taxRatePercent}%)
              </td>
              <td className="py-2 pl-4 text-right">{formatMoney(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function InvoiceTotals({ invoice }: { invoice: InvoiceAmounts }) {
  return (
    <Totals
      subtotal={invoice.subtotal}
      discount={invoice.discountTotal}
      tax={invoice.taxTotal}
      total={invoice.total}
      paid={invoice.amountPaid}
    />
  )
}

export function PaymentsTable({
  payments,
  showNotes,
}: {
  payments: (Payment & { note?: string | null; recordedByName?: string })[]
  showNotes?: boolean
}) {
  if (payments.length === 0)
    return <p className="text-muted">No payments have been recorded yet.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            <th scope="col" className="py-2 pr-4 font-medium">
              Date
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Method
            </th>
            {showNotes ? (
              <th scope="col" className="px-4 py-2 font-medium">
                Recorded by
              </th>
            ) : null}
            {showNotes ? (
              <th scope="col" className="px-4 py-2 font-medium">
                Note
              </th>
            ) : null}
            <th scope="col" className="py-2 pl-4 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="tabular">
          {payments.map((payment) => (
            <tr key={payment.id} className="border-b border-line last:border-0">
              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(payment.paidOn)}</td>
              <td className="px-4 py-2">{humanize(payment.method)}</td>
              {showNotes ? <td className="px-4 py-2">{payment.recordedByName}</td> : null}
              {showNotes ? <td className="px-4 py-2">{payment.note ?? ''}</td> : null}
              <td className="py-2 pl-4 text-right">{formatMoney(payment.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-muted">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
