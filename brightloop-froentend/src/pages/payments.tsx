import { motion } from 'framer-motion'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, CreditCard, Landmark, ReceiptText, Search, SearchX, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CumulativeLineChart } from '@/components/charts/charts'
import { CountUp, CountUpCurrency } from '@/components/common/count-up'
import { PortalGate } from '@/components/common/portal-gate'
import { CardSkeleton, StatSkeleton, TableSkeleton } from '@/components/common/skeletons'
import { EmptyState } from '@/components/common/states'
import { StatCard } from '@/components/common/stat-card'
import { PaymentStatusBadge } from '@/components/common/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePortalData } from '@/context/portal'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { monthlyPayments } from '@/lib/analytics'
import { formatCurrency, formatDate } from '@/lib/format'
import { staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 8

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'succeeded', label: 'Successful' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
]
const methodOptions = [
  { value: 'all', label: 'All methods' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank transfer' },
]
const sortOptions = [
  { value: 'date:desc', label: 'Newest first' },
  { value: 'date:asc', label: 'Oldest first' },
  { value: 'amount:desc', label: 'Amount: high to low' },
  { value: 'amount:asc', label: 'Amount: low to high' },
]

function PaymentsContent() {
  const { payments } = usePortalData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [method, setMethod] = useState('all')
  const [sort, setSort] = useState('date:desc')
  const [page, setPage] = useState(1)

  const successful = payments.filter((p) => p.status === 'succeeded')
  const pending = payments.filter((p) => p.status === 'pending')
  const failed = payments.filter((p) => p.status === 'failed')
  const sum = (list: typeof payments) => list.reduce((t, p) => t + p.amount, 0)
  const chart = useMemo(() => monthlyPayments(payments, 7), [payments])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const [key, dir] = sort.split(':')
    return payments
      .filter((p) => (status === 'all' || p.status === status) && (method === 'all' || p.methodType === method))
      .filter((p) => !q || p.reference.toLowerCase().includes(q) || p.invoiceNumber.toLowerCase().includes(q) || p.methodLabel.toLowerCase().includes(q))
      .sort((a, b) => {
        const cmp = key === 'amount' ? a.amount - b.amount : a.date.localeCompare(b.date)
        return dir === 'asc' ? cmp : -cmp
      })
  }, [payments, query, status, method, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const reset = () => {
    setQuery('')
    setStatus('all')
    setMethod('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <StatCard
          icon={ReceiptText}
          label="Total payments"
          value={<CountUp value={payments.length} />}
          hint={`${failed.length} failed ${failed.length === 1 ? 'attempt' : 'attempts'} included`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Successful payments"
          value={<CountUpCurrency value={sum(successful)} />}
          hint={`${successful.length} ${successful.length === 1 ? 'payment' : 'payments'} received`}
        />
        <StatCard
          icon={Clock3}
          tone="warn"
          label="Pending payments"
          value={<CountUpCurrency value={sum(pending)} />}
          hint={pending.length ? `${pending.length} still processing` : 'Nothing processing'}
        />
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Total paid over time</CardTitle>
          <CardDescription>Running total of successful payments, month by month.</CardDescription>
        </CardHeader>
        <CardContent>
          <CumulativeLineChart data={chart} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search transaction or invoice"
              aria-label="Search payments"
              className="pl-10"
            />
          </div>
          <SimpleSelect aria-label="Filter by status" value={status} onValueChange={(v) => { setStatus(v); setPage(1) }} options={statusOptions} />
          <SimpleSelect aria-label="Filter by payment method" value={method} onValueChange={(v) => { setMethod(v); setPage(1) }} options={methodOptions} />
          <SimpleSelect aria-label="Sort payments" value={sort} onValueChange={(v) => { setSort(v); setPage(1) }} options={sortOptions} />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No payments match your filters"
            description="Try a different search or clear the filters."
            action={
              <Button variant="outline" onClick={reset}>
                <X /> Clear filters
              </Button>
            }
          />
        ) : (
          <div className="border-t border-border/70">
            <Table className="min-w-[820px]">
              <TableHeader>
                <tr>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {rows.map((p, i) => (
                  <TableRow key={p.id} index={i}>
                    <TableCell className="tabular font-bold">{p.reference}</TableCell>
                    <TableCell>
                      <Link to={`/invoices/${p.invoiceId}`} className="tabular font-medium underline-offset-4 hover:text-brand-ink hover:underline">
                        {p.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2.5 whitespace-nowrap text-muted-foreground">
                        <span className="grid size-8 place-items-center rounded-lg bg-secondary text-foreground/70">
                          {p.methodType === 'card' ? <CreditCard className="size-4" /> : <Landmark className="size-4" />}
                        </span>
                        {p.methodLabel}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.date)}</TableCell>
                    <TableCell className={cn('tabular text-right font-semibold', p.status === 'failed' && 'text-muted-foreground line-through decoration-1')}>
                      {formatCurrency(p.amount, p.currency)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                      {p.failureReason && <p className="mt-1 text-xs text-muted-foreground">{p.failureReason}</p>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 px-5 py-3.5 sm:flex-row sm:px-6">
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {filtered.length === 0
              ? 'No payments'
              : `Showing ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </p>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
                <ChevronLeft />
              </Button>
              <span className="tabular min-w-16 text-center text-[13px] font-semibold">
                {current} / {pages}
              </span>
              <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function PaymentsPage() {
  useDocumentTitle('Payment History')
  return (
    <PortalGate
      fallback={
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
          <CardSkeleton className="h-64" />
          <Card>
            <TableSkeleton rows={6} cols={6} />
          </Card>
        </div>
      }
    >
      <PaymentsContent />
    </PortalGate>
  )
}
