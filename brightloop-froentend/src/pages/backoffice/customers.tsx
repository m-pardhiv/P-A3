import { Search, SearchX, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { api } from '@/api'
import { AsyncView } from '@/components/common/async-view'
import { TableSkeleton } from '@/components/common/skeletons'
import { EmptyState } from '@/components/common/states'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CustomerStatusBadge } from '@/features/backoffice/badges'
import { useAsync } from '@/hooks/use-async'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BackofficeCustomer } from '@/types'

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'inactive', label: 'Inactive' },
]

function CustomersContent({ customers }: { customers: BackofficeCustomer[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers.filter(
      (c) =>
        (status === 'all' || c.status === status) &&
        (!q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
    )
  }, [customers, query, status])

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, company or email"
            aria-label="Search customers"
            className="pl-10"
          />
        </div>
        <SimpleSelect aria-label="Filter by status" value={status} onValueChange={setStatus} options={statusOptions} />
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="No customers match" description="Try a different search or filter." />
      ) : (
        <div className="border-t border-border/70">
          <Table className="min-w-[860px]">
            <TableHeader>
              <tr>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active subs</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Customer since</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((c, i) => (
                <TableRow key={c.id} index={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} className="size-9 text-xs" />
                      <div className="min-w-0">
                        <p className="truncate font-bold">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.company} · {c.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CustomerStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="tabular text-right">{c.activeSubscriptions}</TableCell>
                  <TableCell className="tabular text-right font-semibold">{formatCurrency(c.mrr)}</TableCell>
                  <TableCell className={cn('tabular text-right', c.outstanding > 0 ? 'font-semibold text-danger' : 'text-muted-foreground')}>
                    {formatCurrency(c.outstanding)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(c.since)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="border-t border-border/70 px-5 py-3.5 text-[13px] text-muted-foreground sm:px-6">
        <Users className="mr-1.5 inline size-3.5 align-[-2px]" />
        {rows.length} of {customers.length} customers
      </p>
    </Card>
  )
}

export default function CustomersPage() {
  useDocumentTitle('Customers')
  const { state, reload } = useAsync(() => api.listCustomers())
  return (
    <AsyncView
      state={state}
      onRetry={reload}
      skeleton={
        <Card>
          <TableSkeleton rows={7} cols={6} />
        </Card>
      }
    >
      {(customers) => <CustomersContent customers={customers} />}
    </AsyncView>
  )
}
