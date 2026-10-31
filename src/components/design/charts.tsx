import { useReducedMotion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatMoney } from '~/lib/format'

const INK_MUTED = '#6B655C'
const GRID = '#ECE8DF'

/** One bar: the first day of a month (YYYY-MM-01) and an amount in paise. */
export type MonthlyPoint = { month: string; amount: number }

const monthName = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' })
const monthLong = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const shortMonth = (month: string) => monthName.format(new Date(`${month}T00:00:00Z`))
const longMonth = (month: string) => monthLong.format(new Date(`${month}T00:00:00Z`))

type TipProps = {
  active?: boolean
  payload?: { value?: number | string; payload?: MonthlyPoint }[]
  caption: string
}

function ChartTooltip({ active, payload, caption }: TipProps) {
  if (!active || !payload?.length || !payload[0].payload) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lift">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {longMonth(payload[0].payload.month)}
      </p>
      <p className="tabular mt-0.5 text-sm font-bold">{formatMoney(Number(payload[0].value))}</p>
      <p className="text-[11px] text-muted-foreground">{caption}</p>
    </div>
  )
}

/** Monthly amounts as gradient bars. The table underneath is for screen readers. */
export function MonthlyBarChart(props: {
  data: MonthlyPoint[]
  label: string
  caption: string
  height?: number
}) {
  const { data, label, caption, height = 200 } = props
  const reduced = useReducedMotion()
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
          barCategoryGap="28%"
        >
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2503A" />
              <stop offset="100%" stopColor="#B51F52" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 4" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            tickFormatter={shortMonth}
            dy={6}
          />
          <YAxis hide domain={[0, (max: number) => Math.max(max * 1.15, 100)]} />
          <Tooltip
            cursor={{ fill: 'rgba(255,162,182,0.18)', radius: 8 }}
            content={<ChartTooltip caption={caption} />}
          />
          <Bar
            dataKey="amount"
            fill="url(#barFill)"
            radius={[6, 6, 0, 0]}
            maxBarSize={30}
            isAnimationActive={!reduced}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}>
              <td>{longMonth(point.month)}</td>
              <td>{formatMoney(point.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
