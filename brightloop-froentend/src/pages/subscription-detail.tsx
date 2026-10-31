import { motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight, FileQuestion, Settings2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PortalGate } from '@/components/common/portal-gate'
import { ProductIcon } from '@/components/common/product-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@/components/common/skeletons'
import { EmptyState } from '@/components/common/states'
import { InvoiceStatusBadge, SubscriptionStatusBadge } from '@/components/common/status-badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { usePortalData } from '@/context/portal'
import { Timeline } from '@/features/subscriptions/timeline'
import { useSubscriptionActions } from '@/features/subscriptions/use-subscription-actions'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { daysRemaining, invoiceSummary, subscriptionPricing, termProgress } from '@/lib/billing'
import { cycleLabel, cycleUnit, formatCurrency, formatDate, formatPercent } from '@/lib/format'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Subscription } from '@/types'

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[15px] font-semibold">{children}</dd>
    </div>
  )
}

function Row({ label, value, strong, muted }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2.5 text-sm', strong && 'border-t border-border pt-4 text-base font-extrabold')}>
      <dt className={cn(!strong && 'text-muted-foreground')}>{label}</dt>
      <dd className={cn('tabular', muted && 'text-success', !strong && 'font-semibold')}>{value}</dd>
    </div>
  )
}

function Detail({ sub }: { sub: Subscription }) {
  const { invoices } = usePortalData()
  const { actions, request, dialog } = useSubscriptionActions(sub)
  const pricing = subscriptionPricing(sub)
  const progress = termProgress(sub.startDate, sub.expiryDate)
  const left = daysRemaining(sub.expiryDate)
  const related = invoices.filter((i) => i.subscriptionId === sub.id).slice(0, 4)

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={staggerItem}>
        <Link
          to="/subscriptions"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All subscriptions
        </Link>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card className="mesh-hero overflow-hidden">
          <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <ProductIcon icon={sub.productIcon} muted={sub.status === 'closed'} className="size-14 sm:size-16" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{sub.productName}</h2>
                  <SubscriptionStatusBadge status={sub.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {sub.planName} · <span className="tabular">{sub.id}</span>
                </p>
              </div>
            </div>
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2.5">
                {actions.map(({ action, label, icon: Icon, destructive }) => (
                  <Button
                    key={action}
                    variant={destructive ? 'outline' : action === 'renew' ? 'default' : 'outline'}
                    onClick={() => request(action)}
                    className={cn(destructive && 'border-destructive/30 text-destructive hover:border-destructive/60 hover:bg-danger-soft')}
                  >
                    <Icon /> {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle>Subscription information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                  <InfoItem label="Subscription ID">
                    <span className="tabular">{sub.id}</span>
                  </InfoItem>
                  <InfoItem label="Status">
                    <SubscriptionStatusBadge status={sub.status} />
                  </InfoItem>
                  <InfoItem label="Plan">{sub.planName}</InfoItem>
                  <InfoItem label="Billing frequency">{cycleLabel[sub.billingCycle]}</InfoItem>
                  <InfoItem label="Start date">{formatDate(sub.startDate)}</InfoItem>
                  <InfoItem label={sub.status === 'closed' ? 'Ended on' : 'Expiry / renewal date'}>{formatDate(sub.expiryDate)}</InfoItem>
                </dl>
                {sub.status !== 'closed' && (
                  <div className="mt-6 rounded-2xl bg-muted/70 p-4">
                    <div className="mb-2.5 flex items-center justify-between text-[13px]">
                      <span className="font-semibold">Term progress</span>
                      <span className="tabular text-muted-foreground">
                        {sub.status === 'pending'
                          ? 'Starts ' + formatDate(sub.startDate)
                          : left >= 0
                            ? `${progress}% elapsed · ${left} ${left === 1 ? 'day' : 'days'} left`
                            : 'Term ended'}
                      </span>
                    </div>
                    <Progress value={progress} label="Subscription term elapsed" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border/60">
                  <Row label="Quantity" value={`${sub.quantity} ${sub.quantityLabel}`} />
                  <Row label="Unit price" value={`${formatCurrency(sub.unitPrice, sub.currency)} / ${sub.quantityLabel.replace(/s$/, '')}`} />
                  <Row label="Subtotal" value={formatCurrency(pricing.subtotal, sub.currency)} />
                  {sub.discount && (
                    <Row
                      label={`${sub.discount.label} (${sub.discount.percent}%)`}
                      value={`−${formatCurrency(pricing.discount, sub.currency)}`}
                      muted
                    />
                  )}
                  {pricing.taxLines.map((t) => (
                    <Row key={t.rate} label={`Tax (${formatPercent(t.rate)})`} value={formatCurrency(t.amount, sub.currency)} />
                  ))}
                  <Row strong label={`Total per ${cycleUnit[sub.billingCycle]}`} value={formatCurrency(pricing.total, sub.currency)} />
                </dl>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle>Product details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{sub.productDescription}</p>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {sub.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm font-medium">
                      <span className="grid size-5 place-items-center rounded-full bg-accent text-brand-ink">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline events={sub.timeline} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent invoices</CardTitle>
                <Link to="/invoices" className="text-[13px] font-semibold text-brand-ink hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {related.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices for this subscription yet.</p>
                ) : (
                  <ul className="-mx-2">
                    {related.map((inv) => {
                      const s = invoiceSummary(inv)
                      return (
                        <li key={inv.id}>
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-accent/60"
                          >
                            <span className="min-w-0">
                              <span className="tabular block text-sm font-semibold">{inv.number}</span>
                              <span className="text-xs text-muted-foreground">{formatDate(inv.issueDate)}</span>
                            </span>
                            <span className="flex items-center gap-2.5">
                              <span className="text-right">
                                <span className="tabular block text-sm font-semibold">{formatCurrency(s.total, inv.currency)}</span>
                                <InvoiceStatusBadge status={inv.status} className="mt-1 px-2 py-0.5 text-[11px]" />
                              </span>
                              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      {dialog}
    </motion.div>
  )
}

function DetailRoute() {
  const { id } = useParams()
  const { subscriptions } = usePortalData()
  const sub = subscriptions.find((s) => s.id === id)
  useDocumentTitle(sub ? sub.productName : 'Subscription')

  if (!sub) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="We couldn’t find that subscription"
          description="It may not belong to your account, or the link may be out of date."
          action={
            <LinkButton to="/subscriptions">
              <Settings2 /> View my subscriptions
            </LinkButton>
          }
        />
      </Card>
    )
  }
  return <Detail sub={sub} />
}

export default function SubscriptionDetailPage() {
  return (
    <PortalGate
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-5 w-40" />
          <CardSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <CardSkeleton className="lg:col-span-2" />
            <CardSkeleton />
          </div>
        </div>
      }
    >
      <DetailRoute />
    </PortalGate>
  )
}
