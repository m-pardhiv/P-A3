import { motion } from 'framer-motion'
import { CreditCard, Landmark, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/common/states'
import { PaymentStatusBadge } from '@/components/common/status-badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Payment } from '@/types'

export function PaymentActivity({ payments }: { payments: Payment[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent payment activity</CardTitle>
        <Link to="/payments" className="text-[13px] font-semibold text-brand-ink hover:underline">
          View all
        </Link>
      </CardHeader>
      {payments.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments yet" description="Your payments will appear here once they’re made." />
      ) : (
        <ul className="px-3 pb-3 sm:px-4 sm:pb-4">
          {payments.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.25 + i * 0.07 }}
              className="flex items-center gap-3 rounded-2xl px-2.5 py-3 transition-colors hover:bg-accent/60 sm:px-3"
            >
              <span
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-xl',
                  p.status === 'failed' ? 'bg-danger-soft text-danger' : 'bg-secondary text-foreground/70',
                )}
              >
                {p.methodType === 'card' ? <CreditCard className="size-[18px]" /> : <Landmark className="size-[18px]" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="tabular truncate text-[13px] font-bold">{p.reference}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(p.date)} · {p.methodLabel}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn('tabular text-sm font-bold', p.status === 'failed' && 'text-muted-foreground line-through decoration-1')}>
                  {formatCurrency(p.amount, p.currency)}
                </p>
                <PaymentStatusBadge status={p.status} className="mt-1 px-2 py-0.5 text-[11px]" />
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </Card>
  )
}
