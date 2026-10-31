import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/api'
import { AsyncView } from '@/components/common/async-view'
import { CardSkeleton } from '@/components/common/skeletons'
import { EmptyState } from '@/components/common/states'
import { Card } from '@/components/ui/card'
import { SimpleSelect } from '@/components/ui/select'
import { useToast } from '@/context/toast'
import { PriorityBadge, TicketStatusBadge, ticketStatusLabel } from '@/features/backoffice/badges'
import { useAsync } from '@/hooks/use-async'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDate } from '@/lib/format'
import { staggerContainer, staggerItem } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { Ticket, TicketStatus } from '@/types'

type Filter = 'all' | TicketStatus

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'received', label: ticketStatusLabel.received },
  { value: 'in-progress', label: ticketStatusLabel['in-progress'] },
  { value: 'resolved', label: ticketStatusLabel.resolved },
]

const statusOptions = (Object.keys(ticketStatusLabel) as TicketStatus[]).map((s) => ({ value: s, label: ticketStatusLabel[s] }))

function TicketsContent({ tickets, onChange }: { tickets: Ticket[]; onChange: (t: Ticket) => void }) {
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const count = (f: Filter) => (f === 'all' ? tickets.length : tickets.filter((t) => t.status === f).length)
  const visible = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter)

  const setStatus = async (ticket: Ticket, status: TicketStatus) => {
    setBusyId(ticket.id)
    try {
      const updated = await api.updateTicketStatus(ticket.id, status)
      onChange(updated)
      toast.success('Ticket updated', `${ticket.id} is now ${ticketStatusLabel[status].toLowerCase()}.`)
    } catch (e) {
      toast.error('Couldn’t update the ticket', e instanceof Error ? e.message : undefined)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Filter tickets by status" className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                active ? 'border-transparent bg-foreground text-background' : 'border-border bg-card text-foreground/80 hover:border-foreground/25',
              )}
            >
              {f.label}
              <span className={cn('tabular grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold leading-5', active ? 'bg-white/20' : 'bg-secondary text-muted-foreground')}>
                {count(f.value)}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title="Nothing here" description="No tickets in this state right now." />
        </Card>
      ) : (
        <motion.ul key={filter} variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {visible.map((t) => (
            <motion.li key={t.id} variants={staggerItem}>
              <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-bold">{t.subject}</h3>
                    <PriorityBadge priority={t.priority} />
                    <TicketStatusBadge status={t.status} />
                  </div>
                  <p className="tabular mt-1 text-xs text-muted-foreground">
                    {t.id} · {t.customerName}, {t.company} · {t.topic} · {formatDate(t.createdAt)}
                  </p>
                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t.message}</p>
                </div>
                <div className={cn('w-full shrink-0 sm:w-44', busyId === t.id && 'pointer-events-none opacity-60')}>
                  <SimpleSelect
                    aria-label={`Set status for ${t.id}`}
                    value={t.status}
                    onValueChange={(v) => setStatus(t, v as TicketStatus)}
                    options={statusOptions}
                  />
                </div>
              </Card>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}

export default function TicketsPage() {
  useDocumentTitle('Support tickets')
  const { state, reload, setData } = useAsync(() => api.listTickets())
  return (
    <AsyncView
      state={state}
      onRetry={reload}
      skeleton={
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      }
    >
      {(tickets) => <TicketsContent tickets={tickets} onChange={(u) => setData((all) => all.map((t) => (t.id === u.id ? u : t)))} />}
    </AsyncView>
  )
}
