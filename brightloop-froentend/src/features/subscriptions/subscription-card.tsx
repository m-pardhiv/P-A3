import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductIcon } from '@/components/common/product-icon'
import { SubscriptionStatusBadge } from '@/components/common/status-badge'
import { MotionCard } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { subscriptionPricing, termProgress } from '@/lib/billing'
import { cycleLabel, cycleUnit, formatCurrency, formatDate } from '@/lib/format'
import { staggerItem } from '@/lib/motion'
import type { Subscription } from '@/types'

export function SubscriptionCard({ sub }: { sub: Subscription }) {
  const pricing = subscriptionPricing(sub)
  const inactive = sub.status === 'closed'
  return (
    <MotionCard
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group relative flex flex-col transition-shadow duration-300 hover:shadow-lift"
    >
      <Link
        to={`/subscriptions/${sub.id}`}
        className="flex flex-1 flex-col rounded-card p-5 focus-visible:outline-offset-[-2px] sm:p-6"
        aria-label={`${sub.productName}, ${sub.planName}, ${sub.status}. View details`}
      >
        <div className="flex items-start gap-4">
          <ProductIcon icon={sub.productIcon} muted={inactive} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold leading-tight">{sub.productName}</h3>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{sub.planName}</p>
          </div>
          <ArrowUpRight className="size-[18px] shrink-0 text-muted-foreground transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-raspberry" />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="tabular text-2xl font-extrabold leading-none tracking-tight">
              {formatCurrency(pricing.total, sub.currency)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              per {cycleUnit[sub.billingCycle]} · {sub.quantity} {sub.quantityLabel}
            </p>
          </div>
          <SubscriptionStatusBadge status={sub.status} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-4 text-[13px]">
          <div>
            <dt className="text-muted-foreground">Starts</dt>
            <dd className="mt-0.5 font-semibold">{formatDate(sub.startDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{inactive ? 'Ended' : 'Expires'}</dt>
            <dd className="mt-0.5 font-semibold">{formatDate(sub.expiryDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Billing</dt>
            <dd className="mt-0.5 font-semibold">{cycleLabel[sub.billingCycle]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Subscription ID</dt>
            <dd className="tabular mt-0.5 truncate font-semibold">{sub.id}</dd>
          </div>
        </dl>

        {sub.status === 'active' && (
          <div className="mt-4">
            <Progress value={termProgress(sub.startDate, sub.expiryDate)} label={`${sub.productName} term elapsed`} className="h-1.5" />
          </div>
        )}
      </Link>
    </MotionCard>
  )
}
