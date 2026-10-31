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
  const due = props.total - (props.paid ?? 0)

  return (
    <dl className="tabular mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
      <dt className="text-muted-foreground">Subtotal</dt>
      <dd className="text-right">{formatMoney(props.subtotal)}</dd>
      {showDiscount ? (
        <>
          <dt className="text-muted-foreground">Discounts</dt>
          <dd className="text-right font-semibold text-success">
            -{formatMoney(props.discount ?? 0)}
          </dd>
        </>
      ) : null}
      <dt className="text-muted-foreground">Tax</dt>
      <dd className="text-right">{formatMoney(props.tax)}</dd>
      <dt className="border-t border-border/70 pt-2 text-base font-bold">
        {showPaid ? 'Grand total' : 'Total'}
      </dt>
      <dd className="border-t border-border/70 pt-2 text-right text-base font-bold">
        {formatMoney(props.total)}
      </dd>
      {showPaid ? (
        <>
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="text-right">-{formatMoney(props.paid ?? 0)}</dd>
          <dt className="col-span-2 mt-1 grid grid-cols-subgrid rounded-xl bg-accent px-3 py-2.5 font-bold text-accent-foreground">
            <span>Amount due</span>
            <span className="text-right">{formatMoney(due)}</span>
          </dt>
        </>
      ) : null}
    </dl>
  )
}
