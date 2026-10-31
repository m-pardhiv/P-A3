import { ArrowDown, ArrowUp, ArrowUpDown, Download, Eye, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { InvoiceStatusBadge } from '@/components/common/status-badge'
import { Button, LinkButton } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip } from '@/components/ui/tooltip'
import { invoiceSummary } from '@/lib/billing'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/types'
import { useInvoiceDownload } from './use-invoice-download'

export type InvoiceSortKey = 'issueDate' | 'dueDate' | 'total'
export interface InvoiceSort {
  key: InvoiceSortKey
  dir: 'asc' | 'desc'
}

function SortHead({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string
  sortKey: InvoiceSortKey
  sort?: InvoiceSort
  onSort?: (key: InvoiceSortKey) => void
  align?: 'right'
}) {
  if (!onSort) return <TableHead className={align === 'right' ? 'text-right' : undefined}>{label}</TableHead>
  const active = sort?.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead
      className={align === 'right' ? 'text-right' : undefined}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md uppercase tracking-wide transition-colors hover:text-foreground',
          active && 'text-foreground',
        )}
      >
        {label}
        <Icon className={cn('size-3.5', !active && 'opacity-50')} aria-hidden />
      </button>
    </TableHead>
  )
}

export function InvoiceTable({
  invoices,
  variant = 'full',
  sort,
  onSort,
}: {
  invoices: Invoice[]
  /** `compact` is the overview preview; `full` adds paid / outstanding columns. */
  variant?: 'compact' | 'full'
  sort?: InvoiceSort
  onSort?: (key: InvoiceSortKey) => void
}) {
  const { download, busyId } = useInvoiceDownload()
  const full = variant === 'full'

  return (
    <Table className={full ? 'min-w-[980px]' : 'min-w-[680px]'}>
      <TableHeader>
        <tr>
          <TableHead>Invoice</TableHead>
          <SortHead label="Date" sortKey="issueDate" sort={sort} onSort={onSort} />
          <SortHead label="Due date" sortKey="dueDate" sort={sort} onSort={onSort} />
          <SortHead label={full ? 'Total' : 'Amount'} sortKey="total" sort={sort} onSort={onSort} align="right" />
          {full && <TableHead className="text-right">Paid</TableHead>}
          {full && <TableHead className="text-right">Outstanding</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </tr>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice, i) => {
          const s = invoiceSummary(invoice)
          return (
            <TableRow key={invoice.id} index={i}>
              <TableCell>
                <Link
                  to={`/invoices/${invoice.id}`}
                  className="tabular font-bold underline-offset-4 transition-colors hover:text-brand-ink hover:underline"
                >
                  {invoice.number}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(invoice.issueDate)}</TableCell>
              <TableCell
                className={cn('whitespace-nowrap', invoice.status === 'overdue' ? 'font-semibold text-danger' : 'text-muted-foreground')}
              >
                {formatDate(invoice.dueDate)}
              </TableCell>
              <TableCell className="tabular text-right font-semibold">{formatCurrency(s.total, invoice.currency)}</TableCell>
              {full && (
                <TableCell className="tabular text-right text-muted-foreground">{formatCurrency(s.paid, invoice.currency)}</TableCell>
              )}
              {full && (
                <TableCell className={cn('tabular text-right', s.outstanding > 0 ? 'font-semibold' : 'text-muted-foreground')}>
                  {formatCurrency(s.outstanding, invoice.currency)}
                </TableCell>
              )}
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Tooltip content="View invoice">
                    <LinkButton
                      to={`/invoices/${invoice.id}`}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`View invoice ${invoice.number}`}
                    >
                      <Eye />
                    </LinkButton>
                  </Tooltip>
                  <Tooltip content="Download PDF">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Download PDF for invoice ${invoice.number}`}
                      disabled={busyId === invoice.id}
                      onClick={() => download(invoice)}
                    >
                      {busyId === invoice.id ? <Loader2 className="animate-spin" /> : <Download />}
                    </Button>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
