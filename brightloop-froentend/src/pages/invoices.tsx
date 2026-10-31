import { CalendarDays, ChevronLeft, ChevronRight, FileSearch, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PortalGate } from '@/components/common/portal-gate'
import { TableSkeleton } from '@/components/common/skeletons'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { usePortalData } from '@/context/portal'
import { InvoiceTable, type InvoiceSort, type InvoiceSortKey } from '@/features/invoices/invoice-table'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { invoiceSummary } from '@/lib/billing'
import { addDays, formatCurrency, parseDate, startOfToday } from '@/lib/format'

const PAGE_SIZE = 8

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'draft', label: 'Draft' },
]

const dateOptions = [
  { value: 'all', label: 'Any date' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last 12 months' },
]

const sortOptions = [
  { value: 'issueDate:desc', label: 'Newest first' },
  { value: 'issueDate:asc', label: 'Oldest first' },
  { value: 'total:desc', label: 'Amount: high to low' },
  { value: 'total:asc', label: 'Amount: low to high' },
  { value: 'dueDate:asc', label: 'Due date: soonest' },
  { value: 'dueDate:desc', label: 'Due date: latest' },
]

function InvoicesContent() {
  const { invoices, subscriptions } = usePortalData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [range, setRange] = useState('all')
  const [sort, setSort] = useState<InvoiceSort>({ key: 'issueDate', dir: 'desc' })
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cutoff = range === 'all' ? null : addDays(startOfToday(), -Number(range))
    const productOf = new Map(subscriptions.map((s) => [s.id, s.productName.toLowerCase()]))
    const list = invoices.filter((inv) => {
      if (status !== 'all' && inv.status !== status) return false
      if (cutoff && parseDate(inv.issueDate) < cutoff) return false
      if (!q) return true
      const total = invoiceSummary(inv).total
      return (
        inv.number.toLowerCase().includes(q) ||
        (productOf.get(inv.subscriptionId) ?? '').includes(q) ||
        total.toFixed(2).includes(q.replace(/[$,]/g, ''))
      )
    })
    const value = (inv: (typeof invoices)[number]) =>
      sort.key === 'total' ? invoiceSummary(inv).total : sort.key === 'dueDate' ? inv.dueDate : inv.issueDate
    return list.sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [invoices, subscriptions, query, status, range, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const filtersActive = query !== '' || status !== 'all' || range !== 'all'

  const outstanding = invoices.reduce((sum, inv) => sum + invoiceSummary(inv).outstanding, 0)
  const openCount = invoices.filter((inv) => invoiceSummary(inv).outstanding > 0).length

  const handleSort = (key: InvoiceSortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'dueDate' ? 'asc' : 'desc' }))
    setPage(1)
  }
  const reset = () => {
    setQuery('')
    setStatus('all')
    setRange('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Every invoice we’ve issued to your account. Open one for the full breakdown, or download a PDF copy.
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="tabular font-bold text-foreground">{formatCurrency(outstanding)}</span> outstanding across {openCount}{' '}
          {openCount === 1 ? 'invoice' : 'invoices'}
        </p>
      </div>

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
              placeholder="Search invoice number or product"
              aria-label="Search invoices"
              className="pl-10"
            />
          </div>
          <SimpleSelect
            aria-label="Filter by status"
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
            options={statusOptions}
          />
          <SimpleSelect
            aria-label="Filter by date"
            value={range}
            onValueChange={(v) => {
              setRange(v)
              setPage(1)
            }}
            options={dateOptions}
            icon={<CalendarDays className="size-4 text-muted-foreground" />}
          />
          <SimpleSelect
            aria-label="Sort invoices"
            value={`${sort.key}:${sort.dir}`}
            onValueChange={(v) => {
              const [key, dir] = v.split(':') as [InvoiceSortKey, 'asc' | 'desc']
              setSort({ key, dir })
              setPage(1)
            }}
            options={sortOptions}
          />
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No invoices match your filters"
            description="Try a different search term or clear the filters to see everything."
            action={
              <Button variant="outline" onClick={reset}>
                <X /> Clear filters
              </Button>
            }
          />
        ) : (
          <div className="border-t border-border/70">
            <InvoiceTable invoices={rows} sort={sort} onSort={handleSort} />
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 px-5 py-3.5 sm:flex-row sm:px-6">
          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {filtered.length === 0
              ? 'No invoices'
              : `Showing ${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} of ${filtered.length} ${
                  filtered.length === 1 ? 'invoice' : 'invoices'
                }`}
            {filtersActive && filtered.length > 0 && (
              <button type="button" onClick={reset} className="ml-2 font-semibold text-brand-ink hover:underline">
                Clear filters
              </button>
            )}
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

export default function InvoicesPage() {
  useDocumentTitle('Invoices')
  return (
    <PortalGate
      fallback={
        <div className="space-y-6">
          <div className="skeleton h-5 w-2/3 max-w-lg" />
          <Card>
            <div className="p-5">
              <div className="skeleton h-11 w-full" />
            </div>
            <TableSkeleton rows={7} cols={7} />
          </Card>
        </div>
      }
    >
      <InvoicesContent />
    </PortalGate>
  )
}
