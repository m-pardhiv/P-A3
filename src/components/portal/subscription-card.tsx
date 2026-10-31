import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { PlanIcon } from '~/components/design/plan-icon'
import { StatusBadge } from '~/components/status-badge'
import { MotionCard } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { formatDate, formatMoney, humanize } from '~/lib/format'
import { staggerItem } from '~/lib/motion'
import { periodUnit, termProgress } from '~/lib/term'

export type SubscriptionRow = {
  id: string
  number: string
  status: string
  planName: string
  billingPeriod: string
  startDate: string
  expiryDate: string | null
  amount: number
  tax: number
  quantity: number
}

export function SubscriptionCard({ sub, today }: { sub: SubscriptionRow; today: string }) {
  const closed = sub.status === 'closed'
  return (
    <MotionCard
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group relative flex flex-col transition-shadow duration-300 hover:shadow-lift"
    >
      <Link
        to="/portal/subscriptions/$id"
        params={{ id: sub.id }}
        className="flex flex-1 flex-col rounded-card p-5 focus-visible:outline-offset-[-2px] sm:p-6"
        aria-label={`${sub.planName}, ${sub.number}, ${sub.status}. View details`}
      >
        <div className="flex items-start gap-4">
          <PlanIcon name={sub.planName} muted={closed} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold leading-tight">{sub.planName}</h3>
            <p className="tabular mt-0.5 truncate text-sm text-muted-foreground">{sub.number}</p>
          </div>
          <ArrowUpRight className="size-[18px] shrink-0 text-muted-foreground transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-raspberry" />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="tabular text-2xl font-extrabold leading-none tracking-tight">
              {formatMoney(sub.amount + sub.tax)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              incl. tax per {periodUnit[sub.billingPeriod] ?? sub.billingPeriod} · {sub.quantity}{' '}
              {sub.quantity === 1 ? 'unit' : 'units'}
            </p>
          </div>
          <StatusBadge status={sub.status} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-4 text-[13px]">
          <div>
            <dt className="text-muted-foreground">Starts</dt>
            <dd className="mt-0.5 font-semibold">{formatDate(sub.startDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{closed ? 'Ended' : 'Expires'}</dt>
            <dd className="mt-0.5 font-semibold">{formatDate(sub.expiryDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Billing</dt>
            <dd className="mt-0.5 font-semibold">{humanize(sub.billingPeriod)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Subscription ID</dt>
            <dd className="tabular mt-0.5 truncate font-semibold">{sub.number}</dd>
          </div>
        </dl>

        {sub.status === 'active' && sub.expiryDate ? (
          <div className="mt-4">
            <Progress
              value={termProgress(sub.startDate, sub.expiryDate, today)}
              label={`${sub.planName} term elapsed`}
              className="h-1.5"
            />
          </div>
        ) : null}
      </Link>
    </MotionCard>
  )
}
