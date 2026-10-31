import { formatMoney } from '~/lib/format'

export function Totals(props: {
  subtotal: number
  discount?: number
  tax: number
  total: number
  paid?: number
}) {
  const showDiscount = (props.discount ?? 0) > 0
  const showPaid = props.paid !== undefined

  return (
    <dl className="tabular mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1">
      <dt className="text-muted">Subtotal</dt>
      <dd className="text-right">{formatMoney(props.subtotal)}</dd>
      {showDiscount ? (
        <>
          <dt className="text-muted">Discounts</dt>
          <dd className="text-right text-success">-{formatMoney(props.discount ?? 0)}</dd>
        </>
      ) : null}
      <dt className="text-muted">Tax</dt>
      <dd className="text-right">{formatMoney(props.tax)}</dd>
      <dt className="border-t border-line pt-1 font-semibold">Total</dt>
      <dd className="border-t border-line pt-1 text-right font-semibold">
        {formatMoney(props.total)}
      </dd>
      {showPaid ? (
        <>
          <dt className="text-muted">Paid</dt>
          <dd className="text-right">{formatMoney(props.paid ?? 0)}</dd>
          <dt className="font-semibold">Amount due</dt>
          <dd className="text-right font-semibold">
            {formatMoney(props.total - (props.paid ?? 0))}
          </dd>
        </>
      ) : null}
    </dl>
  )
}
