import { formatMoney } from '~/lib/format'

export function Totals(props: { subtotal: number; tax: number; total: number }) {
  return (
    <dl className="tabular mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1">
      <dt className="text-muted">Subtotal</dt>
      <dd className="text-right">{formatMoney(props.subtotal)}</dd>
      <dt className="text-muted">Tax</dt>
      <dd className="text-right">{formatMoney(props.tax)}</dd>
      <dt className="border-t border-line pt-1 font-semibold">Total</dt>
      <dd className="border-t border-line pt-1 text-right font-semibold">
        {formatMoney(props.total)}
      </dd>
    </dl>
  )
}
