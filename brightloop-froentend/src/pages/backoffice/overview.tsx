import { motion } from 'framer-motion'
import { CircleAlert, Inbox, Layers, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import { SpendBarChart } from '@/components/charts/charts'
import { AsyncView } from '@/components/common/async-view'
import { CountUp, CountUpCurrency } from '@/components/common/count-up'
import { CardSkeleton, StatSkeleton } from '@/components/common/skeletons'
import { StatCard } from '@/components/common/stat-card'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from '@/context/portal'
import { PriorityBadge, TicketStatusBadge } from '@/features/backoffice/badges'
import { useAsync } from '@/hooks/use-async'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatCurrency, formatDate } from '@/lib/format'
import { staggerContainer, staggerItem } from '@/lib/motion'
import type { BackofficeCustomer, BackofficeSummary, Ticket } from '@/types'

function Content({
  summary,
  tickets,
  customers,
  admin,
  name,
}: {
  summary: BackofficeSummary
  tickets: Ticket[]
  customers: BackofficeCustomer[]
  admin: boolean
  name: string
}) {
  const base = admin ? '/admin' : '/staff'
  const open = tickets.filter((t) => t.status !== 'resolved').slice(0, 5)
  const attention = customers.filter((c) => c.status === 'overdue').sort((a, b) => b.outstanding - a.outstanding)
  const chart = summary.revenueByMonth.map((m) => ({ key: m.month, month: m.month, amount: m.amount, cumulative: m.amount }))

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={staggerItem}>
        <Card className="mesh-hero overflow-hidden">
          <div className="p-6 sm:p-9">
            <p className="text-[13px] font-semibold text-muted-foreground">{admin ? 'Admin console' : 'Staff console'}</p>
            <h2 className="mt-1.5 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
              Welcome, <span className="text-gradient">{name.split(' ')[0]}</span>
            </h2>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              {admin
                ? 'Revenue, customers, support and plan settings across Brightloop.'
                : 'Everything you need to look after customers and keep the support queue moving.'}
            </p>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerContainer} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inbox} tone={summary.openTickets > 0 ? 'warn' : 'brand'} label="Open tickets" value={<CountUp value={summary.openTickets} />} hint="Waiting on us" />
        <StatCard icon={Users} label="Customers" value={<CountUp value={summary.customers} />} hint={`${summary.overdueAccounts} with overdue invoices`} />
        <StatCard icon={Layers} label="Active subscriptions" value={<CountUp value={summary.activeSubscriptions} />} hint="Across all customers" />
        <StatCard icon={TrendingUp} label="Monthly recurring revenue" value={<CountUpCurrency value={summary.mrr} />} hint="Sample portfolio" />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-12">
        {admin && (
          <motion.div variants={staggerItem} className="min-w-0 lg:col-span-5">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Monthly recurring revenue</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
              </CardHeader>
              <div className="px-3 pb-5 sm:px-4">
                <SpendBarChart data={chart} height={230} caption="Recurring revenue" label="Bar chart of monthly recurring revenue over six months" />
              </div>
            </Card>
          </motion.div>
        )}
        <motion.div variants={staggerItem} className={`min-w-0 ${admin ? 'lg:col-span-7' : 'lg:col-span-7'}`}>
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Open tickets</CardTitle>
              <Link to={`${base}/tickets`} className="text-[13px] font-semibold text-brand-ink hover:underline">
                View all
              </Link>
            </CardHeader>
            <ul className="px-3 pb-4 sm:px-4">
              {open.length === 0 && <li className="px-3 py-6 text-sm text-muted-foreground">No open tickets. Nice work.</li>}
              {open.map((t) => (
                <li key={t.id}>
                  <Link to={`${base}/tickets`} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-accent/60">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{t.subject}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.customerName}, {t.company} · {formatDate(t.createdAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={t.priority} />
                      <TicketStatusBadge status={t.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
        <motion.div variants={staggerItem} className={`min-w-0 ${admin ? 'lg:col-span-12' : 'lg:col-span-5'}`}>
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Needs attention</CardTitle>
              <Link to={`${base}/customers`} className="text-[13px] font-semibold text-brand-ink hover:underline">
                All customers
              </Link>
            </CardHeader>
            <ul className="px-3 pb-4 sm:px-4">
              {attention.length === 0 && <li className="px-3 py-6 text-sm text-muted-foreground">No overdue accounts.</li>}
              {attention.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
                      <CircleAlert className="size-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{c.company}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.name}</span>
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-bold">{formatCurrency(c.outstanding)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function BackofficeOverviewPage() {
  const session = useSession()
  useDocumentTitle('Overview')
  const { state, reload } = useAsync(() => Promise.all([api.getBackofficeSummary(), api.listTickets(), api.listCustomers()]))
  return (
    <AsyncView
      state={state}
      onRetry={reload}
      skeleton={
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-12">
            <CardSkeleton className="lg:col-span-7" />
            <CardSkeleton className="lg:col-span-5" />
          </div>
        </div>
      }
    >
      {([summary, tickets, customers]) => (
        <Content summary={summary} tickets={tickets} customers={customers} admin={session.role === 'admin'} name={session.name} />
      )}
    </AsyncView>
  )
}
