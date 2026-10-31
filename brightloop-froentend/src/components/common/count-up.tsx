import { useCountUp } from '@/hooks/use-count-up'
import { formatCurrency } from '@/lib/format'

/** Number that counts up on mount. Renders the final value to assistive tech immediately. */
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  delay,
  className,
}: {
  value: number
  format?: (n: number) => string
  delay?: number
  className?: string
}) {
  const current = useCountUp(value, { delay })
  return (
    <span className={className}>
      <span aria-hidden>{format(current)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}

export function CountUpCurrency({ value, currency = 'USD', ...rest }: { value: number; currency?: string; delay?: number; className?: string }) {
  return <CountUp value={value} format={(n) => formatCurrency(n, currency)} {...rest} />
}
