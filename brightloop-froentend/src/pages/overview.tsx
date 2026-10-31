import { motion } from 'framer-motion'
import { CalendarClock, CircleDollarSign, FileText, Layers, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SpendBarChart } from '@/components/charts/charts'
import { CountUp, CountUpCurrency } from '@/components/common/count-up'
import { PortalGate } from '@/components/common/portal-gate'
import { CardSkeleton, StatSkeleton, TableSkeleton } from '@/components/common/skeletons'
import { EmptyState } from '@/components/common/states'
import { StatCard } from '@/components/common/stat-card'
import { LinkButton } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { usePortalData } from '@/context/portal'
import { CurrentSubscription } from '@/features/overview/current-subscription'
import { PaymentActivity } from '@/features/overview/payment-activity'
import { QuickActions } from '@/features/overview/quick-actions'
import { WelcomeHero } from '@/features/overview/welcome-hero'
import { InvoiceTable } from '@/features/invoices/invoice-table'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { monthlyPayments } from '@/lib/analytics'
import { daysRemaining, invoiceSummary } from '@/lib/billing'
import { formatCurrency, formatRelativeDays, formatShortDate } from '@/lib/format'
import { staggerContainer, staggerItem } from '@/lib/motion'

function OverviewContent() {
  const { customer, subscriptions, invoices, payments } = usePortalData()

  const view = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === 'active')
    const upcoming = active.filter((s) => daysRemaining(s.expiryDate) >= 0).sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    const featured = upcoming[0] ?? active[0]
    const totalPaid = payments.filter((p) => p.status === 'succeeded').reduce((t, p) => t + p.amount, 0)
    const summaries = invoices.map((inv) => ({ inv, ...invoiceSummary(inv) }))
    const outstanding = summaries.reduce((t, s) => t + s.outstanding, 0)
    const owing = summaries.filter((s) => s.outstanding > 0)
    const overdue = summaries.filter((s) => s.inv.status === 'overdue').length
    const chart = monthlyPayments(payments, 6)
    return {
      active,
      featured,
      nextRenewal: upcoming[0],
      totalPaid,
      successfulCount: payments.filter((p) => p.status === 'succeeded').length,
      outstanding,
      owingCount: owing.length,
      overdue,
      chart,
      chartTotal: chart.reduce((t, p) => t + p.amount, 0),
      recentInvoices: invoices.filter((i) => i.status !== 'draft').slice(0, 5),
      recentPayments: payments.slice(0, 5),
    }
  }, [subscriptions, invoices, payments])

  const renewal = view.nextRenewal

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={staggerItem}>
        <WelcomeHero
          firstName={customer.fullName.split(' ')[0]}
          attentionCount={view.overdue}
          renewalChip={renewal ? `${renewal.productName.replace('Brightloop ', '')} renews ${formatRelativeDays(renewal.expiryDate)}` : undefined}
        />
      </motion.div>

      <motion.div variants={staggerContainer} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Active subscriptions"
          value={<CountUp value={view.active.length} />}
          hint={`of ${subscriptions.length} total subscriptions`}
        />
        <StatCard
          icon={CalendarClock}
          label="Next renewal"
          value={renewal ? formatShortDate(renewal.expiryDate) : '—'}
          hint={renewal ? `${renewal.productName.replace('Brightloop ', '')} · ${formatRelativeDays(renewal.expiryDate)}` : 'No upcoming renewals'}
        />
        <StatCard
          icon={Wallet}
          label="Total paid"
          value={<CountUpCurrency value={view.totalPaid} delay={0.1} />}
          hint={`Across ${view.successfulCount} successful payments`}
        />
        <StatCard
          icon={CircleDollarSign}
          tone={view.outstanding > 0 ? 'warn' : 'brand'}
          label="Outstanding amount"
          value={<CountUpCurrency value={view.outstanding} delay={0.15} />}
          hint={
            view.outstanding > 0
              ? `${view.owingCount} ${view.owingCount === 1 ? 'invoice' : 'invoices'}${view.overdue ? ` · ${view.overdue} overdue` : ''}`
              : 'You’re all paid up'
          }
        />
      </motion.div>

      <QuickActions subscriptionPath={view.featured ? `/subscriptions/${view.featured.id}` : '/subscriptions'} />

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div variants={staggerItem} className="min-w-0 lg:col-span-8">
          <CurrentSubscription sub={view.featured} />
        </motion.div>
        <motion.div variants={staggerItem} className="min-w-0 lg:col-span-4">
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>Payments received</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
              <p className="tabular pt-2 text-2xl font-extrabold tracking-tight">
                <CountUpCurrency value={view.chartTotal} delay={0.2} />
              </p>
            </CardHeader>
            <div className="mt-auto px-3 pb-5 sm:px-4">
              <SpendBarChart data={view.chart} />
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.div variants={staggerItem} className="min-w-0 lg:col-span-8">
          <Card className="h-full overflow-hidden">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent invoices</CardTitle>
              <LinkButton to="/invoices" variant="soft" size="sm">
                View all invoices
              </LinkButton>
            </CardHeader>
            {view.recentInvoices.length === 0 ? (
              <EmptyState icon={FileText} title="No invoices yet" description="Invoices will appear here once they’re issued." />
            ) : (
              <InvoiceTable invoices={view.recentInvoices} variant="compact" />
            )}
            {view.outstanding > 0 && (
              <p className="border-t border-border/70 px-5 py-3.5 text-[13px] text-muted-foreground sm:px-6">
                You have <span className="tabular font-semibold text-foreground">{formatCurrency(view.outstanding)}</span> outstanding.{' '}
                <Link to="/invoices" className="font-semibold text-brand-ink hover:underline">
                  Review invoices
                </Link>
              </p>
            )}
          </Card>
        </motion.div>
        <motion.div variants={staggerItem} className="min-w-0 lg:col-span-4">
          <PaymentActivity payments={view.recentPayments} />
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function OverviewPage() {
  useDocumentTitle('Overview')
  return (
    <PortalGate
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-52 rounded-[1.75rem]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-12">
            <CardSkeleton className="min-w-0 lg:col-span-8" />
            <CardSkeleton className="min-w-0 lg:col-span-4" />
          </div>
          <Card>
            <TableSkeleton rows={4} cols={5} />
          </Card>
        </div>
      }
    >
      <OverviewContent />
    </PortalGate>
  )
}
