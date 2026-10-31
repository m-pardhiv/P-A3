import { useReducedMotion } from 'framer-motion'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyPoint } from '@/lib/analytics'
import { formatCurrency } from '@/lib/format'

const INK_MUTED = '#6B655C'
const GRID = '#ECE8DF'

interface TipProps {
  active?: boolean
  payload?: { value?: number | string }[]
  label?: string | number
  caption: string
}

function ChartTooltip({ active, payload, label, caption }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lift">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-sm font-bold">{formatCurrency(Number(payload[0].value))}</p>
      <p className="text-[11px] text-muted-foreground">{caption}</p>
    </div>
  )
}

/** Screen-reader / keyboard fallback so the data isn't only available visually. */
function DataTable({ data, field, caption }: { data: MonthlyPoint[]; field: 'amount' | 'cumulative'; caption: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Month</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.key}>
            <td>{d.month}</td>
            <td>{formatCurrency(d[field])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SpendBarChart({
  data,
  height = 200,
  caption = 'Paid this month',
  label = 'Bar chart of monthly payments over the last six months',
}: {
  data: MonthlyPoint[]
  height?: number
  caption?: string
  label?: string
}) {
  const reduced = useReducedMotion()
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
          <defs>
            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2503A" />
              <stop offset="100%" stopColor="#B51F52" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 4" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: INK_MUTED, fontSize: 12 }} dy={6} />
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
      <DataTable data={data} field="amount" caption="Payments received per month" />
    </div>
  )
}

export function CumulativeLineChart({ data, height = 240 }: { data: MonthlyPoint[]; height?: number }) {
  const reduced = useReducedMotion()
  return (
    <div role="img" aria-label="Line chart of total amount paid over time" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B51F52" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#FFA2B6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E2503A" />
              <stop offset="100%" stopColor="#B51F52" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 4" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: INK_MUTED, fontSize: 12 }} dy={6} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={52}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            tickFormatter={(v: number) => formatCurrency(v, 'USD', { compact: true })}
          />
          <Tooltip
            cursor={{ stroke: '#B51F52', strokeWidth: 1, strokeDasharray: '3 3' }}
            content={<ChartTooltip caption="Total paid to date" />}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="url(#lineStroke)"
            strokeWidth={2.5}
            fill="url(#areaFill)"
            dot={{ r: 3.5, fill: '#fff', stroke: '#B51F52', strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: '#B51F52', stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={!reduced}
            animationDuration={1100}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
      <DataTable data={data} field="cumulative" caption="Cumulative amount paid by month" />
    </div>
  )
}
