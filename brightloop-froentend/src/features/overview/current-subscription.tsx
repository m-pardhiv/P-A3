import { ChevronDown, Layers, Settings2 } from 'lucide-react'
import { ProductIcon } from '@/components/common/product-icon'
import { EmptyState } from '@/components/common/states'
import { SubscriptionStatusBadge } from '@/components/common/status-badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { useSubscriptionActions } from '@/features/subscriptions/use-subscription-actions'
import { daysRemaining, subscriptionPricing, termProgress } from '@/lib/billing'
import { cycleLabel, cycleUnit, formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Subscription } from '@/types'

function Fact({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold">{value}</dd>
    </div>
  )
}

export function CurrentSubscription({ sub }: { sub?: Subscription }) {
  if (!sub) {
    return (
      <Card className="flex h-full items-center justify-center">
        <EmptyState
          icon={Layers}
          title="No active subscription"
          description="When you have an active subscription, its details and renewal date will appear here."
          action={<LinkButton to="/subscriptions">View my subscriptions</LinkButton>}
        />
      </Card>
    )
  }
  return <CurrentSubscriptionCard sub={sub} />
}

function CurrentSubscriptionCard({ sub }: { sub: Subscription }) {
  const { actions, request, dialog } = useSubscriptionActions(sub)
  const pricing = subscriptionPricing(sub)
  const progress = termProgress(sub.startDate, sub.expiryDate)
  const left = daysRemaining(sub.expiryDate)

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative border-b border-border/70 bg-gradient-to-br from-brand-50 via-white to-white px-5 py-5 sm:px-7 sm:py-6">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-brand-ink">Current subscription</p>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ProductIcon icon={sub.productIcon} className="size-14" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl font-extrabold tracking-tight">{sub.productName}</h3>
                <SubscriptionStatusBadge status={sub.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {sub.planName} · <span className="tabular">{sub.id}</span>
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="tabular text-3xl font-extrabold leading-none tracking-tight">
              {formatCurrency(pricing.total, sub.currency)}
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">per {cycleUnit[sub.billingCycle]}, incl. tax</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-6 sm:px-7">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Fact label="Start date" value={formatDate(sub.startDate)} />
          <Fact label="Renewal date" value={formatDate(sub.expiryDate)} />
          <Fact label="Billing" value={cycleLabel[sub.billingCycle]} />
          <Fact label="Quantity" value={`${sub.quantity} ${sub.quantityLabel}`} />
        </dl>

        <div className="mt-6">
          <div className="mb-2.5 flex items-center justify-between text-[13px]">
            <span className="font-semibold">Subscription period</span>
            <span className="tabular text-muted-foreground">
              {progress}% elapsed · {left >= 0 ? `${left} ${left === 1 ? 'day' : 'days'} left` : 'ended'}
            </span>
          </div>
          <Progress value={progress} label="Subscription period elapsed" className="h-2.5" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{formatDate(sub.startDate)}</span>
            <span>{formatDate(sub.expiryDate)}</span>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap gap-2.5 pt-6">
          <LinkButton to={`/subscriptions/${sub.id}`}>View details</LinkButton>
          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="group">
                  <Settings2 /> Manage subscription
                  <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {actions.map(({ action, label, icon: Icon, destructive }) => (
                  <DropdownMenuItem key={action} destructive={destructive} onSelect={() => request(action)}>
                    <Icon /> <span className={cn(!destructive && 'text-foreground')}>{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {dialog}
    </Card>
  )
}
